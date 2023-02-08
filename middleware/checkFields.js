const {ErrorResponse, MissingRequiredError, NotFoundError} = require ('../utils/errors')

exports.checkFields = (fields, allowedFields, requiredFields) => {

    if (Array.isArray(fields) || !(fields instanceof Object) || typeof err === 'string') {
        //return new Error('Body has to be an object', 400);
        //return new Error(JSON.stringify({ message: 'Body has to be an object', status: 400 }));
        //const error = new Error(JSON.stringify({ message: 'Body has to be an object', status: 400 }));
        //res.status(400).send(error.message);
        try {
            fields = JSON.parse(fields);
        } catch (err) {
            return new ErrorResponse('Body has to be an object', 400);
        }
    }

    if (allowedFields) {

        const badFields = Object.keys(fields).filter((e) => !allowedFields.includes(e));
        if (badFields.length > 0) {
            const message = {field: badFields[0], message: 'Unrecognized field name'}
            return new ErrorResponse(message, 400);
        }
    }

    if (requiredFields) {

        const missingFields = requiredFields.filter((e) => !Object.keys(fields).includes(e));
        if (missingFields.length > 0) {
             return new MissingRequiredError(missingFields[0]);
            // const error = new Error();
            // rror.message = { field: missingFields[0], message: 'is required' };
            // error.status = 400;
            // return error;
           
        }
    }
    return fields;
};
//for in for of   populate   why json to object and opisit  also diff? new Error(message); what kind of msg  
//when we use `a` to give out the body in postman nust be object? its json ofishal but I know its object
//and if its text we need to parse it to object not to json which will not work 