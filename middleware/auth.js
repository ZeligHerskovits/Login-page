const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

