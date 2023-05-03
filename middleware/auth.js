const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.checkToken = (async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) throw new Error('You need to enter a token');

        req.user = await decodeFunction(token);
        next();
    } catch (err) {
        next(err);
    }
    return req.user;
});

async function decodeFunction(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // I need to remove .populate('customer')
    const user = await User.findById(decoded.user_id).populate('refToRole').populate('customer').populate('roleObject');//roleObject we dont need to complete it with data in order to populate it the question is why ?
    if (!user) {
        throw 'no user found';
    }
    return user;
}

