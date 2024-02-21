const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.checkToken = (async (req, res, next) => {
    if (req.headers?.check === 'google') { checkMyToken(req, res, next) }
    else if (!req.headers?.check) {
        try {
            const token = req.cookies.token;
            if (!token) throw new Error('You need to enter a token');

            req.user = await decodeFunction(token);
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

        const token = authorizationHeader.split(' ')[1];
        if (!token) throw new Error('You need to enter a token');

        req.user = await decodeFunction(token);
        next();
    } catch (err) {
        next(err);
    }
    return req.user;
};

async function decodeFunction(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // I need to remove .populate('customer')
    const user = await User.findById(decoded.user_id).populate('refToRole').populate('roleObject')//.populate('customer')
    if (!user) {
        throw 'no user found';
    }
    return user;
}

