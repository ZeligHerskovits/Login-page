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
    console.log("err................", err)
    var json = JSON.stringify(err);
    console.log("json...............", json)
    var json2 = JSON.parse(json);
    console.log("json2..............", json2)
    if (err.message === "invalid signature") {
        err.message = err.message.replace("signature", "token");
    }
    console.log(err.message);
    var status;
    if (err.status === 400) { status = 400 }
    else if (err.status === 500) { status = 500 }
    res.status(status ? status : 400).json({ //.send(err.message);
        error: err.message
    });
};

exports.checkFields = (fields, allowedFields, requiredFields) => {

    if (Array.isArray(fields) || !(fields instanceof Object) || typeof err === 'string') {
        //return new Error('Body has to be an object', 400);
        //return new Error(JSON.stringify({ message: 'Body has to be an object', status: 400 }));
        //const error = new Error(JSON.stringify({ message: 'Body has to be an object', status: 400 }));
        //res.status(400).send(error.message);
        try {
            fields = JSON.parse(fields);
        } catch (err) {
            const error = new Error();
            error.message = { message: 'Body has to be an object' }
            error.status = 400;
            return error;
        }
    }

    if (allowedFields) {

        const badFields = Object.keys(fields).filter((e) => !allowedFields.includes(e));
        if (badFields.length > 0) {
            const error = new Error();
            error.message = { field: badFields[0], message: 'unrecognized field name' };
            error.status = 400;
            return error;
        }
    }

    if (requiredFields) {

        const missingFields = requiredFields.filter((e) => !Object.keys(fields).includes(e));
        if (missingFields.length > 0) {
            const error = new Error();
            error.message = { field: missingFields[0], message: 'is required' };
            error.status = 400;
            return error;
        }
    }
    return fields;
};
//for in for of   populate   why json to object and opisit  also diff? new Error(message); what kind of msg  
//when we use `a` to give out the body in postman nust be object? its json ofishal but I know its object
//and if its text we need to parse it to object not to json which will not work 