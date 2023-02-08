function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.errorHandler = (err, req, res, next) => {
    
    let error  = { ...err };
    // if (typeof err === 'string') {
    //     err = { message: err };
    // }
    // if (typeof err === 'object') {
    //     err.message = JSON.stringify(err.message)
    // }
    if (isJsonString(err.message)) {
        err.message = JSON.parse(err.message)
    }
    
    if (err.message === "invalid signature") {
        err.message = err.message.replace("signature", "token");
    }
    // if (err.message.includes('\"')) {
    //     err = err.replace('\"', ' ');
    // }
    
    res.status(error?.statusCode || 400).json({ //.send(err.message);
        error: err.message
    });
};

