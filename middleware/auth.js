const _jwt = require('jsonwebtoken');
const User = require('../models/User');
var express = require('express')
var cookieParser = require('cookie-parser')

var app = express()
app.use(cookieParser())
// exports.checkToken = asyncHandler(async (req, res, next) => {
//     const token = req.body.token;
//     let user = await User.findOne({ email: req.body.email });
//     const tokenObject = await Token.findOne({
//       token: token,
//       user: user._id,
//       type: tokenTypes.email,
//       expired: false
//     });
//     if (tokenObject) {
//       await User.findByIdAndUpdate(user._id, { verified: true });
//       await Token.deleteOne({ "token": token });
//       return res.status(200).end();
//     }
//     else {
//       return next(new NotFoundError('User', 400));
//     }
//   });
exports.checkToken = (async (req, res, next) => {
    if (req.headers?.check === 'google') { checkMyToken(req, res, next) }
    else if (!req.headers?.check) {
        try {
           const jwt = req.cookies?.jwt;
           if (!jwt) throw new Error('You need to enter a jwt');

            req.user = await decodeFunction(jwt);
            next();
        } catch (err) {
            next(err);
        }
        return req.user;
    }
});

async function checkMyToken (req, res, next) {
    try {
        const authorizationHeader = req.headers['authorization'];
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            throw new Error('Invalid authorization header');
        }

        const jwt = authorizationHeader.split(' ')[1];
        if (!jwt) throw new Error('You need to enter a jwt');

        req.user = await decodeFunction(jwt);
        next();
    } catch (err) {
        next(err);
    }
    return req.user;
};

async function decodeFunction(jwt) {
    const decoded = _jwt.verify(jwt, process.env.JWT_SECRET);
    // I need to remove .populate('customer')
    const user = await User.findById(decoded.user_id).populate('refToRole').populate('roleObject')//.populate('customer')
    if (!user) {
        throw 'no user found';
    }
    return user;
}

