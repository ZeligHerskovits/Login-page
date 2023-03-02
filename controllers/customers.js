const { ErrorResponse, MissingRequiredError, NotFoundError } = require('../utils/errors')
const User = require('../models/User');
const Customer = require('../models/Customer');
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });
const { checkFields } = require('../middleware/checkFields');
//const { ObjectId } = require('mongodb');

module.exports.insertCustomer = (async (body, next) => {

  let allowedFields = ['email', 'password', 'firstName', 'lastName', 'phoneNumber']
  let requiredFields = ['email', 'password', 'firstName', 'lastName', 'phoneNumber']

  let fields = checkFields(body, allowedFields, requiredFields);
  if (fields instanceof Error) return next(fields);

  let user = await User.findOne({ email: body.email })
  if (user) return next(new ErrorResponse('user already exist', 400));

  let checkForCustomer = await Customer.findOne({ email: body.email })
  if (checkForCustomer) return next(new ErrorResponse('customer already exist', 400));

  // const existingDoc = await Customer.findOne({ _id: ObjectId('63eeac50d1f22583e91efce2') });
  // const newDoc = { _id: existingDoc._id, name: 'John Doe', email: 'johndoe@example.com' };
  // await Customer.create(newDoc);

  const customer = await Customer.create({
    email: body.email,
    password: body.password,
    firstName: body.firstName,
    lastName: body.lastName,
    phoneNumber: body.phoneNumber,
  });

  return customer
});

exports.createCustomer = (async (req, res, next) => {

  const customer = insertCustomer(req, next)
  return res.status(200).json(customer);
});


