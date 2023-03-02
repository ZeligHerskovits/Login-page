const { ErrorResponse, MissingRequiredError, NotFoundError } = require('../utils/errors')
const User = require('../models/User');
const bcrypt = require('bcrypt');
const Token = require('../models/Token');
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });
const { checkFields } = require('../middleware/checkFields');
const { insertCustomer } = require('../controllers/customers')
const { Error } = require('mongoose');
const Customer = require('../models/Customer');

exports.register = (async (req, res, next) => {
    try {
        const customer = await insertCustomer({
            ...req.body
        }, next)

        let allowedFields = ['email', 'password', 'firstName', 'lastName', 'phoneNumber']
        let requiredFields = ['email', 'password', 'firstName', 'lastName', 'phoneNumber']

        let fields = checkFields(req.body, allowedFields, requiredFields);
        if (fields instanceof Error) return next(fields);

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
        const c = await Customer.findOne({ email: req.body.email }).populate('userObject')
        const d = c.userObject._doc.role
        const q = c.userObject._id
        const r = d.role
        const user2 = await User.findOne({ email: req.body.email }).populate('roleObject')
        const b = user2.roleObject._id
        const z = user2.roleObject._doc.phoneNumber

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);

        const token = crypto.randomBytes(32).toString("hex");
        await Token.create({ token: token, user: user._id });

        return res.status(200).json(user);
    }
    catch (e) {
        // if (e.code === 11000 && e.message.includes("duplicate key error")) {
        //     return next(new ErrorResponse('Customer with this id already exists', 400));
        // } else {
        //return next( new Error(`Error: ${e.message}   errorCode: ${e.code }`));
        console.log(e.stack)
        return next(new ErrorResponse(e.message, 400));
        //}
    }
});

exports.login = (async (req, res, next) => {

    let fields = checkFields(req.body, ['email', 'password'], ['email', 'password']);
    if (fields instanceof Error) return next(fields);
    const { email, password } = fields;
    const user = await User.findOne({ email }).select('+password').populate('roleObject');
    if (!user) return next(new ErrorResponse('Invalid email', 400))

    const isMatch = bcrypt.compare(password, user.password);
    if (!isMatch) return next(new ErrorResponse('Invalid password', 400))

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

exports.logout = (async (req, res, next) => {
    return res
        .clearCookie("token")
        .status(200)
        .json({ message: "You have successfully Loged out" });
    // res.header('x-user-token', '').status(200).send('You have sucsesfully loged out')
    // res.status(200).cookie('token', '', options).end();
});

exports.getUser = (async (req, res, next) => {
    const o = req.user.customer
    const p = req.user.customer._id
    const y = req.user.refToRole._id
    const d = req.user.refToRole
    const l = req.user.refToRole.lastName
    const n = req.user.roleObject
    const a = req.user.roleObject._id
    const b = req.user.customer.firstName
    //this is not working //req.user.roleObject.lastName = "pljj"
    const user = await User.findById(req.user._id).populate('roleObject')
    const i = user.roleObject._id
    const f = user.roleObject._doc.lastName
    //this is not working //const m = user.roleObject._doc.lastName = "plm"
    await user.save();
    if (!user) return next(new NotFoundError("User", 400));
    res.status(200).send(user);
});
// diff from refToRole and roleObject ? refToRolewe need to fill out in order to populate vs roleObject we dont need to fill out in order to populate why ?
// when we log in the check for password if its correct is still not working 
// still getting this error UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'call' of undefined
// still need to connect FE to BE