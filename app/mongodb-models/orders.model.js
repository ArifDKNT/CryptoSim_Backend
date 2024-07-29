const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    username: { type: String, required: true },
    coin: { type: String, required: true },
    value: { type: Number, required: true }, // The amount of money involved in the transaction
    value2: { type: Number, required: true }, // The amount of cryptocurrency involved in the transaction
    price: { type: Number, required: true }, // The price per unit of the cryptocurrency
    type: { type: String, required: true, enum: ['buy', 'sell'] }, // The type of the order (buy or sell)
    status: { type: String, default: 'pending', enum: ['pending', 'fulfilled', 'cancelled'] }, // The status of the order
    date: { type: Date, default: Date.now } // The date when the order was created
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;