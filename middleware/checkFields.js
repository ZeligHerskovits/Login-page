const { ErrorResponse, MissingRequiredError, NotFoundError } = require('../utils/errors');

exports.checkFields = (fields, allowedFields, requiredFields) => {

    if (Array.isArray(fields) || !(fields instanceof Object)) {//|| typeof err === 'string'
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
            let message = { field: badFields[0], message: 'Unrecognized field name' }
            return new ErrorResponse(JSON.stringify(message), 400);//`field: ${badFields[0]},  message: 'Unrecognized field name'` 
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