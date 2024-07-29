const config = require("../config/auth.config");
const db = require("../mongodb-models");
const User = db.user;
const Logs = db.logs;


const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Receives register request with username, email and password, writes user to database
exports.register = (req, res) => {
    const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password, // Hashing the password before saving
        balance: 10000,
        cryptocurrencies: {}, // Initializing an empty cryptocurrencies object
        transactions: [], // Initializing an empty transactions array
        weeklyProgress: [] // Initializing an empty weeklyProgress array
    });

    user.save((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            Logs.create({
                username: req.body.username,
                email: req.body.email,
                time: new Date(),
                action: "Register",
                status: err
            });
            return;
        }

        Logs.create({
            username: req.body.username,
            email: req.body.email,
            time: new Date(),
            action: "Register",
            status: "Successful"
        });

        res.send({ message: "User was registered successfully!" });
    });
};

// Receives username and password from frontend, validates and returns user id, username, email and JWT accesstoken
exports.login = (req, res) => {
    User.findOne({
        username: req.body.username
    })
        .exec((err, user) => {
            console.log(user, '123')
            if (err) {
                res.status(500).send({ message: err });
                Logs.create({
                    username: req.body.username,
                    email: req.body.email,
                    time: Date(),
                    action: "Login",
                    status: err
                });
                return;
            }

            if (!user) {
                Logs.create({
                    username: req.body.username,
                    email: req.body.email,
                    time: Date(),
                    action: "Login",
                    status: "User not found"
                });
                return res.status(404).send({ message: "User Not found." });
            }

            var passwordIsValid = req.body.password === user.password ? true : false;


            if (!passwordIsValid) {
                Logs.create({
                    username: req.body.username,
                    email: req.body.email,
                    time: Date(),
                    action: "Login",
                    status: "Invalid password"
                });
                return res.status(401).send({
                    accessToken: null,
                    message: "Invalid Password!"
                });
            }

            var token = jwt.sign({ id: user.id }, config.secret);

            Logs.create({
                username: req.body.username,
                email: req.body.email,
                time: Date(),
                action: "Login",
                status: "Successfull. Token: " + token
            });

            const currentUser = {
                id: user._id,
                username: user.username,
                email: user.email,
                accessToken: token,
                balance: user.balance,
                cryptocurrencies: user.cryptocurrencies,
                transactions: user.transactions,
                weeklyProgress: user.weeklyProgress,
            }
            res.status(200).send(
                {
                    user: currentUser,
                }
            );
        });
};


