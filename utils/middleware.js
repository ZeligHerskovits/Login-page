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

exports.errorHandler = (err, req, res, next) => {

    if (typeof err === 'string') {
        err = { message: err };
    }
    //var json = JSON.stringify(err);
    if (err.message === "invalid signature") {
        err.message = err.message.replace("signature", "token");
    }
    console.error(err.message);
    var status;
    if (err.status === 400) { status = 400 }
    else if (err.status === 500) { status = 500 }
    res.status(status).json({
        error: err.message
    },
    );
};

exports.checkFields = (fields, allowedFields, requiredFields) => {

    if (Array.isArray(fields) || !(fields instanceof Object)) {
        //return new Error('Body has to be an object', 400);
        //return new Error(JSON.stringify({ message: 'Body has to be an object', status: 400 }));
        //const error = new Error(JSON.stringify({ message: 'Body has to be an object', status: 400 }));
        //res.status(400).send(error.message);
        return new Error(JSON.stringify({ message: 'Body has to be an object', status: 400 }));

    }

    if (allowedFields) {

        const goodFields = allowedFields;
        let badFields = Object.keys(fields).filter((e) => !goodFields.includes(e));
        if (badFields.length > 0) {

            // const message = { field: badFields[0], message: 'unrecognized field name' };
            // const error = new Error(JSON.stringify(message));
            // error.message = JSON.parse(error.message, (key, value) => {
            //   if (key === 'message') {
            //     return value.replace(/\\/g, '');
            //   }
            //   return value;
            // });
            // error.status = 400;
            // return error;

            const message = { field: badFields[0], message: 'unrecognized field name' };
            const error = new Error(message);
            error.message = message
            error.status = 400;
            return error;
        }
    }

    if (requiredFields) {

        let missingFields = requiredFields.filter((e) => !Object.keys(fields).includes(e));
        if (missingFields.length > 0) {
            const message = { field: missingFields[0], message: 'is required' };
            const error = new Error(message);
            error.message = message
            error.status = 400;
            return error;
        }
    }
};
