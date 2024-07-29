const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    type: String,
    coin: String,
    amount: Number,
    price: Number,
    date: { type: Date, default: Date.now }
});

const weeklyProgressSchema = new mongoose.Schema({
    week: Number,
    year: Number,
    startingBalance: Number,
    endingBalance: Number,
    profit: Number
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 10000 },
    cryptocurrencies: { type: Map, of: Number, default: {} },
    transactions: [transactionSchema],
    weeklyProgress: [weeklyProgressSchema]
});

const User = mongoose.model("User", userSchema);

module.exports = User;
