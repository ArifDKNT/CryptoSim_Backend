const createError = require('http-errors');
const express = require('express');
const socketIo = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const http = require('http');
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoClient } = require('mongodb');
const initialize = require('./orderListener'); // Import the order listener

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // Allow your frontend URL
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

const corsOptions = {
    origin: "*"
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Database configuration
const dbConfig = require("./app/config/db.config.js");
const mongoURI = `mongodb+srv://dkntarif:iVzTobMzF67nSwvK@cluster0.iv7i2ga.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Successfully connected to MongoDB.");
}).catch(err => {
    console.error("Connection error", err);
    process.exit();
});

// Importing routes
require('./routes/exchange.routes')(app);

// WebSocket and Change Streams setup
const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

async function watchUserChanges() {
    await client.connect();
    const db = client.db('test'); // Replace with your database name
    const userCollection = db.collection('users');
    
    const changeStream = userCollection.watch();
    
    changeStream.on('change', async (change) => {
        if (change.operationType === 'update' || change.operationType === 'replace') {
            const allUsers = await userCollection.find().toArray();
            io.emit('allUsersDataChanged', allUsers);
        }
    });
}

watchUserChanges().catch(console.error);

io.on('connection', (socket) => {
    console.log('a user connected');

    // Listen for an event where the client provides their user ID
    socket.on('join', (userId) => {
        console.log(`User ${userId} joined room`);
        socket.join(userId);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// Start the order listener
initialize().catch(console.error);

server.listen(4000, () => {
    console.log('listening on *:4000');
});

// Auth routes and middlewares
const { verifyRegister } = require("./app/middlewares");
const { authJwt } = require("./app/middlewares");
const authController = require("./app/controllers/auth.controller");
const userController = require("./app/controllers/user.controller");

app.use(function(req, res, next) {
    res.header(
        "Access-Control-Allow-Headers",
        "x-access-token, Origin, Content-Type, Accept"
    );
    next();
});

app.post("/auth/register", [verifyRegister.checkDuplicateUsernameOrEmail], authController.register);
app.post("/auth/login", authController.login);

// User endpoints with verifyToken middleware
app.post("/user/balance", [authJwt.verifyToken], userController.getUserBalance);
app.post("/user/buy", [authJwt.verifyToken], userController.buy);
app.post("/user/sell", [authJwt.verifyToken], userController.sell);
app.post("/user/buyOrder", [authJwt.verifyToken], userController.buyOrder);
app.post("/user/sellOrder", [authJwt.verifyToken], userController.sellOrder);
app.post("/user/value", [authJwt.verifyToken], userController.getUserValue);
app.get("/user/getAllUsers",userController.getAllUsers);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;