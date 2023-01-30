const User = require('../models/User');
const bcrypt = require('bcrypt');
const Token = require('../models/Token');
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });

exports.register = (async (req, res, next) => {
    try {
        let user = await User.findOne({ email: req.body.email })
        if (user) throw new Error('user already exist')

        user = await User.create({
            email: req.body.email, password: req.body.password, firstName: req.body.firstName, lastName: req.body.lastName
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);

        const token = crypto.randomBytes(32).toString("hex");
        await Token.create({ token: token, user: user._id });

        return res.status(200).json(user);
    }
    catch (err) {
        next(err);
    }
});

exports.login = (async (req, res, next) => {

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password')
    try {
        if (!user)
            throw new Error('nvalid email')
    } catch (err) {
        next(err)
    }

    const isMatch = bcrypt.compare(password, user.password);
    try {
        if (!isMatch) throw new Error('Invalid password')
    }
    catch (err) {
        next(err)
    }

    const token = user.getSignedJwtToken();

    return res
        .cookie("token", token, {
            expires: new Date(Date.now() + process.env.JWT_EXP_TIME * 86400000),
            domain: process.env.DOMAIN,
            httpOnly: true,
        })
        .status(200)
        .json({ message: "Logged in successfully" });
    //res.header('x-user-token', token).status(200).send('You have sucsesfully loged in')

});

exports.logout = (async (req, res, next) => {

    return res
        .clearCookie("token")
        .status(200)
        .json({ message: "You have successfully Loged out" });
    // res.header('x-user-token', '').status(200).send('You have sucsesfully loged out')
    // res.status(200).cookie('token', '', options).end();
});

exports.getUser = (async (req, res) => {
    try {
        const user = await User.findById(req.user.user_id)
        if (!user) throw new Error("no user found");
        res.status(200).send(user);
    }
    catch (err) {
        next(err);
    }
});

