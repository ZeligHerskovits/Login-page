const { ErrorResponse, MissingRequiredError, NotFoundError } = require('../utils/errors');
const User = require('../models/User');
//const bcrypt = require('bcrypt');
const Token = require('../models/Token');
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });
const { checkFields } = require('../middleware/checkFields');
const { insertOrUpdateCustomer } = require('../controllers/customers');
const { Error } = require('mongoose');
const Customer = require('../models/Customer');

// POST /auth/register
exports.register = (async (req, res, next) => {
   
   //const a = await Customer.deleteMany({ firstName: { $nin: ["zelig", "zelig2", "zelig3", "zelig4"] } });
    try {
        // if (fields instanceof MissingRequiredError || fields instanceof ErrorResponse)throw fields//throw fields;
        //return next(new ErrorResponse(fields, 400));
        const customer = await insertOrUpdateCustomer(req);

        const user = await User.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: req.body.password,
            phoneNumber: req.body.phoneNumber,
            role: 'Customer',
            refToRole: customer._id,
            customer: customer._id
        });
        customer.userObject = user

        const c = await Customer.findOne({ email: req.body.email })
        const a = c.userObject._doc.role
        const b = c.userObject._id
        const d = a.role
        const user2 = await User.findOne({ email: req.body.email })
        const e = user2.roleObject._id
        const f = user2.roleObject._doc.phoneNumber

        // const salt = await bcrypt.genSalt(10);
        // user.password = await bcrypt.hash(user.password, salt);

        const token = crypto.randomBytes(32).toString("hex");
        await Token.create({ token: token, user: user._id });

        return res.status(200).json(user);
    }
    catch (e) {
        // if (e.code === 11000 && e.message.includes("duplicate key error")) {
        //     return next(new ErrorResponse('Customer with this id already exists', 400));
        // } else {
        //return next( new Error(`Error: ${e.message}   errorCode: ${e.code }`));
        console.log(e.stack);
        return next(new ErrorResponse(e.message, 400));
        //}
    }
});

// POST /auth/login
exports.login = (async (req, res, next) => {

    let fields = checkFields(req.body, ['email', 'password'], ['email', 'password']);
    if (fields instanceof Error) return next(fields);
    const { email, password } = fields;
    const user = await User.findOne({ email }).select('+password')
    if (!user) return next(new ErrorResponse('Invalid email', 400));

    // const isMatch = bcrypt.compare(password, user.password);
    // if (!isMatch) return next(new ErrorResponse('Invalid password', 400));

    const token = user.getSignedJwtToken();

    return res
        .cookie("token", token, {
            expires: new Date(Date.now() + process.env.JWT_EXP_TIME * 86400000),
            domain: process.env.DOMAIN,
            httpOnly: true,
        })
        .status(200)
        .json({ message: "Logged in successfully" });
    //res.header('x-user-token', token).status(200).send('You have sucsesfully loged in')
});

// POST /auth/logout
exports.logout = (async (req, res, next) => {
    return res
        .clearCookie("token")
        .status(200)
        .json({ message: "You have successfully Loged out" });
    // res.header('x-user-token', '').status(200).send('You have sucsesfully loged out')
    // res.status(200).cookie('token', '', options).end();
});

// GET /auth/me
exports.getUser = (async (req, res, next) => {
    const a = req.user.customer
    const b = req.user.customer._id
    const c = req.user.refToRole._id
    const d = req.user.refToRole
    const e = req.user.refToRole.lastName
    const f = req.user.roleObject
    const g = req.user.roleObject._id
    const h = req.user.customer.firstName
    //this is not working //req.user.roleObject.lastName = "pljj"
    const user = await User.findById(req.user._id)
    const i = user.roleObject._id
    const j = user.roleObject._doc.lastName
    //this is not working //const m = user.roleObject._doc.lastName = "plm"
    //so basicly to add data with the populate is not working only to see the data 
    await user.save();
    if (!user) return next(new NotFoundError("User", 400));
    res.status(200).send(user);
});