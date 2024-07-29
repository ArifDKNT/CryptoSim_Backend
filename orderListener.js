const WebSocket = require('ws');
const mongoose = require('mongoose');
const db = require("./app/mongodb-models");
const User = db.user;
const Logs = db.logs;
const Order = db.orders;

let ws;
let activeCoins = new Set();

async function getRelevantCoins() {
    // Fetch all unique coins from pending buy and sell orders
    const buyOrders = await Order.find({ type: 'buy', status: 'pending' }).distinct('coin');
    const sellOrders = await Order.find({ type: 'sell', status: 'pending' }).distinct('coin');
    return new Set([...buyOrders, ...sellOrders]);
}

async function processOrders(ticker) {
    const coin = ticker.s;
    const marketPrice = parseFloat(ticker.c);

    // Check pending buy orders
    const buyOrders = await Order.find({ coin, type: 'buy', status: 'pending' });
    for (const order of buyOrders) {
        console.log(marketPrice,"---",order.price)
        if (marketPrice <= order.price) {
            const user = await User.findOne({ username: order.username });
            if (user) {
                user.balance -= parseFloat(order.value);
                user.cryptocurrencies.set(coin, (Number(user.cryptocurrencies.get(coin)) || 0) + Number(order.value2));

                user.transactions.push({
                    type: "buy",
                    coin,
                    amount: order.value2,
                    price: order.price,
                    date: new Date()
                });

                await user.save();

                order.status = 'fulfilled';
                await order.save();

                await Logs.create({
                    username: order.username,
                    email: "not provided",
                    time: new Date(),
                    action: "Buy Order",
                    status: `Successful. Bought: ${order.value2} of ${coin} at ${marketPrice}`
                });
            }
        }
    }

    // Check pending sell orders
    const sellOrders = await Order.find({ coin, type: 'sell', status: 'pending' });
    for (const order of sellOrders) {
        if (marketPrice >= order.price) {
            const user = await User.findOne({ username: order.username });
            if (user) {
                user.balance += parseFloat(order.value);
                user.cryptocurrencies.set(coin, (Number(user.cryptocurrencies.get(coin)) || 0) - Number(order.value2));

                user.transactions.push({
                    type: "sell",
                    coin,
                    amount: order.value2,
                    price: marketPrice,
                    date: new Date()
                });

                await user.save();

                order.status = 'fulfilled';
                await order.save();

                await Logs.create({
                    username: order.username,
                    email: "not provided",
                    time: new Date(),
                    action: "Sell Order",
                    status: `Successful. Sold: ${order.value2} of ${coin} at ${marketPrice}`
                });
            }
        }
    }
}

async function listenToMarketData() {
    const relevantCoins = await getRelevantCoins();
    const streams = Array.from(relevantCoins).map(coin => `${coin.toLowerCase()}@ticker`).join('/');

    if (ws) {
        ws.close();
    }

    ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.on('open', function open() {
        console.log('WebSocket connected');
    });

    ws.on('message', async function incoming(data) {
        try {
            const { data: tickers } = JSON.parse(data);
            if (Array.isArray(tickers)) {
                for (const ticker of tickers) {
                    await processOrders(ticker);
                }
            } else {
                await processOrders(tickers);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });

    ws.on('close', function close() {
        console.log('WebSocket disconnected. Attempting to reconnect...');
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
        ws.close(); // Close and attempt to reconnect
    });
}

async function watchOrderChanges() {
    const client = await mongoose.connect('mongodb+srv://dkntarif:iVzTobMzF67nSwvK@cluster0.iv7i2ga.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.connection.db;

    const orderCollection = db.collection('orders');
    const changeStream = orderCollection.watch();

    changeStream.on('change', async (change) => {
        if (change.operationType === 'insert') {
            const newCoin = change.fullDocument.coin;
            if (!activeCoins.has(newCoin)) {
                activeCoins.add(newCoin);
                console.log(`New coin detected: ${newCoin}. Restarting WebSocket...`);
                listenToMarketData();
            }
        }
    });
}

async function initialize() {
    activeCoins = await getRelevantCoins();
    listenToMarketData();
    watchOrderChanges();
}

module.exports = initialize;
