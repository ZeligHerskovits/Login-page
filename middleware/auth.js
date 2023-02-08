const jwt = require('jsonwebtoken');

exports.checkToken = (async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) throw new Error('Pls enter a token')

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.log('err.messssage......', err.message, 'err.stack......', err.stack)
        next(err);
    }
    return req.user;
});

