const db = require("../mongodb-models");
const User = db.user;
const Logs = db.logs;
const Order = db.orders;
const mongoose = require("mongoose");

// Receives username from frontend and returns complete portfolio
exports.getUserBalance = (req, res) => {
    User.findOne({
        username: req.body.username
    })
        .exec((err, user) => {
            if (err) {
                res.status(500).send({message: err});
                Logs.create({
                    username: req.body.username,
                    email: "not provided",
                    time: Date(),
                    action: "Get user balance",
                    status: err
                });
                return;
            }

            if (!user) {
                Logs.create({
                    username: req.body.username,
                    email: "not provided",
                    time: Date(),
                    action: "Get user balance",
                    status: "User not found"
                });
                return res.status(404).send({message: "User Not found."});
            }
            
            return res.status(200).send({
                username: user.username,
                balance: user.balance,
                cryptocurrencies: user.cryptocurrencies
            });
        });
};

// Receives a coin type and a us dollar value, writes new balances into database and returns new balance and amount of coins bought
exports.buy = async (req, res) => {
    const { username, coin, value, value2, price } = req.body;

    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        const user = await User.findOne({ username }).session(session);

        if (!user) {
            await Logs.create({
                username,
                email: "not provided",
                time: new Date(),
                action: "Buy",
                status: "User not found"
            });
            await session.abortTransaction();
            session.endSession();
            return res.status(404).send({ message: "User Not found." });
        }

        user.balance -= parseFloat(value);
        user.cryptocurrencies.set(coin, (Number(user.cryptocurrencies.get(coin)) || 0) + Number(value2));

        user.transactions.push({
            type: "buy",
            coin,
            amount: value2,
            price: parseFloat(price),
            date: new Date()
        });

        await user.save({ session });

        await Logs.create({
            username,
            email: "not provided",
            time: new Date(),
            action: "Buy",
            status: `Successful. Bought: ${value2} of ${coin}`
        });

        await session.commitTransaction();
        session.endSession();

        res.status(200).send({
            balance: user.balance,
            coinBalance: user.cryptocurrencies.get(coin)
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message });
    }
};

exports.sell = async (req, res) => {
    const { username, coin, value, value2, price } = req.body;

    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        const user = await User.findOne({ username }).session(session);

        if (!user) {
            await Logs.create({
                username,
                email: "not provided",
                time: new Date(),
                action: "Sell",
                status: "User not found"
            });
            await session.abortTransaction();
            session.endSession();
            return res.status(404).send({ message: "User Not found." });
        }

        if (Number(value2) > Number(user.cryptocurrencies.get(coin))) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ message: "Not enough coins to sell." });
        }

        user.balance += parseFloat(value);
        user.cryptocurrencies.set(coin, (Number(user.cryptocurrencies.get(coin)) || 0) - Number(value2));

        user.transactions.push({
            type: "sell",
            coin,
            amount: Number(value2),
            price: parseFloat(price),
            date: new Date()
        });

        await user.save({ session });

        await Logs.create({
            username,
            email: "not provided",
            time: new Date(),
            action: "Sell",
            status: `Successful. Sold ${Number(value2)} of ${coin}`
        });

        await session.commitTransaction();
        session.endSession();

        res.status(200).send({
            balance: user.balance,
            coinBalance: user.cryptocurrencies.get(coin)
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message });
    }
};

exports.buyOrder = async (req, res) => {
    const { username, coin, value, value2, price } = req.body;
    try {
        const order = new Order({
            username,
            coin,
            value,
            value2,
            price,
            type: 'buy'
        });

        await order.save();

        Logs.create({
            username,
            email: "not provided",
            time: new Date(),
            action: "Buy Order",
            status: `Order placed. ${value2} of ${coin} at ${price}`
        });

        res.status(200).send({ message: "Buy order placed." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message });
    }
};

exports.sellOrder = async (req, res) => {
    const { username, coin, value, value2, price } = req.body;
    try {
        const order = new Order({
            username,
            coin,
            value,
            value2,
            price,
            type: 'sell'
        });

        await order.save();

        Logs.create({
            username,
            email: "not provided",
            time: new Date(),
            action: "Sell Order",
            status: `Order placed. ${value2} of ${coin} at ${price}`
        });

        res.status(200).send({ message: "Sell order placed." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message });
    }
};

// Calculates the complete value of the users portfolio
exports.getUserValue = (req, res) => {
    User.findOne({
        username: req.body.username
    })
        .exec((err, user) => {
            if (err) {
                res.status(500).send({message: err});
                Logs.create({
                    username: req.body.username,
                    email: "not provided",
                    time: Date(),
                    action: "Get user value",
                    status: err
                });
                return;
            }

            if (!user) {
                Logs.create({
                    username: req.body.username,
                    email: "not provided",
                    time: Date(),
                    action: "Get user value",
                    status: "User not found"
                });
                return res.status(404).send({message: "User Not found."});
            }
            else{
                res.status(200).send({
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    balance: user.balance,
                    cryptocurrencies: user.cryptocurrencies,
                    transactions: user.transactions,
                    weeklyProgress: user.weeklyProgress,
                });
            }
         
        });
};

exports.getAllUsers = (req, res) => {
    User.find({})
        .exec((err, users) => {
            if (err) {
                res.status(500).send({ message: err });
                Logs.create({
                    username: "system",
                    email: "not provided",
                    time: new Date(),
                    action: "Get all users",
                    status: err
                });
                return;
            }

            if (!users || users.length === 0) {
                Logs.create({
                    username: "system",
                    email: "not provided",
                    time: new Date(),
                    action: "Get all users",
                    status: "No users found"
                });
                return res.status(404).send({ message: "No users found." });
            }

            const usersData = users.map(user => ({
                id: user._id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                cryptocurrencies: user.cryptocurrencies,
                transactions: user.transactions,
                weeklyProgress: user.weeklyProgress,
            }));

            res.status(200).send(usersData);

            Logs.create({
                username: "system",
                email: "not provided",
                time: new Date(),
                action: "Get all users",
                status: "Success"
            });
        });
};
