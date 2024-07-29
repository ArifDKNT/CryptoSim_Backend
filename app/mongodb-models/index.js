const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./user.model");
db.logs = require("./logs.model")
db.orders = require("./orders.model")

module.exports = db;