const { ErrorResponse, MissingRequiredError, NotFoundError } = require('../utils/errors');
const User = require('../models/User');
const Customer = require('../models/Customer');
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });
const { checkFields } = require('../middleware/checkFields');
const mongoose = require('mongoose');
const url = require('url');
//const { ObjectId } = require('mongodb');


module.exports.insertOrUpdateCustomer = async (req) => {
  
  let allowedFields = req.url !== '/auth/register' ?
    ['email', 'firstName', 'lastName', 'phoneNumber', 'companyName'] :
    ['email', 'firstName', 'lastName', 'phoneNumber', 'password'];

  // let requiredFields = req.url !== '/auth/register' ?
  // ['email', 'firstName', 'lastName', 'phoneNumber', 'companyName'] :
  // req.method !== 'PUT' ?
  // ['email', 'firstName', 'lastName', 'phoneNumber', 'password'] :
  // req.url !== '/auth/register' && req.method === 'PUT' ?
  // [] :
  // undefined;

  let requiredFields;

  if (req.url !== '/auth/register' && req.method === 'PUT') {
    requiredFields = [];
  } else if (req.url !== '/auth/register') {
    requiredFields = ['email', 'firstName', 'lastName', 'phoneNumber', 'companyName'];
  } else if (req.method !== 'PUT') {
    requiredFields = ['email', 'firstName', 'lastName', 'phoneNumber', 'password'];
  } 

  console.log("requiredFields..........", requiredFields)
  const fields = checkFields(req.body, allowedFields, requiredFields);
  if (fields instanceof Error) throw fields;

  const user = await User.findOne({ email: req.body.email });
  if (user) throw new ErrorResponse('User with this email already exist', 400);

  const checkForCustomer = await Customer.findOne({ email: req.body.email });
  if (checkForCustomer) throw new ErrorResponse('Customer with this email already exist', 400);

  // const existingDoc = await Customer.findOne({ _id: ObjectId('63eeac50d1f22583e91efce2') });
  // const newDoc = { _id: existingDoc._id, name: 'John Doe', email: 'johndoe@example.com' };
  // await Customer.create(newDoc);

  let customer = req.method !== 'PUT' ? await Customer.create({
    email: req.body.email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    companyName: req.body.companyName,
    phoneNumber: req.body.phoneNumber,
  }) : await Customer.findByIdAndUpdate(req.params.customer_id, { //...req.body, 
    email: req.body.email, firstName: req.body.firstName,
    lastName: req.body.lastName, companyName: req.body.companyName,
    phoneNumber: req.body.phoneNumber,
  }, { new: true })
  // // .then(updatedUser => {
  // //   console.log(updatedUser);
  // // })

  return customer
}

// POST /customer
exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await module.exports.insertOrUpdateCustomer(req);
    return res.status(200).send(customer);
  } catch (error) {
    return next(error);
  }
}

// GET /customer/customer_id
exports.getCustomer = async (req, res, next) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.customer_id)) {
    throw new ErrorResponse('Not a valid ObjectId', 400);
  }
  //let customer = await Customer.findById(req.params.customer_id);
  const customer = await Customer.findOne({ _id: req.params.customer_id }).populate('userObject');
  if (!customer) return next(new NotFoundError('Customer'));

  if (req.user.role !== 'Dispatcher' && req.user.roleObject._id.toString() !== req.params.customer_id) {
    return next(new ErrorResponse('You are not allowed to see this customer'));
  }

  return res.status(200).json(customer);
};

// GET /customers
exports.getCustomers = async (req, res, next) => {
  const results = await Customer.find();

  return res.status(200).json(results);
};

// DELETE /customers/customer_id
exports.deleteCustomer = async (req, res, next) => {
  //const customer = await Customer.findByIdAndDelete(req.params.customer_id);
  if (!mongoose.Types.ObjectId.isValid(req.params.customer_id)) {
    throw new ErrorResponse('Not a valid ObjectId', 400);
  }
  const customer = await Customer.deleteOne({ _id: req.params.customer_id });
  if (!customer) return next(new NotFoundError('Customer'));

  await User.deleteOne({
    role: 'Customer',
    refToRole: req.params.customer_id,
  });

  return res.status(200).end();
};

// PUT /customers/customer_id
exports.updateCustomer = async (req, res, next) => {
  // console.log("req.path....." + req.path)
  // console.log("req.url....." + req.url)
  try {
    // let allowedFields = req.url.includes('customer') ?
    //   ['email', 'firstName', 'lastName', 'phoneNumber'] :
    //   ['email', 'firstName', 'lastName', 'phoneNumber', 'password'];

    // let requiredFields = req.url.includes('customer') ?
    //   ['email', 'firstName', 'lastName', 'phoneNumber'] :
    //   ['email', 'firstName', 'lastName', 'phoneNumber', 'password'];

    // // if (req.url.includes('customer')) {
    // //   allowedFields.push('password');
    // //   requiredFields.push('password');
    // // }

    //   let user = await User.findOne({ email: req.body.email });
    // if (user) throw new ErrorResponse('user already exist', 400);

    // let checkForCustomer = await Customer.findOne({ email: req.body.email });
    // if (checkForCustomer) throw new ErrorResponse('customer already exist', 400);

    if (!mongoose.Types.ObjectId.isValid(req.params.customer_id)) {
      throw new ErrorResponse('Not a valid ObjectId', 400);
    }
    let customer = await Customer.findById(req.params.customer_id);
    if (!customer) throw new NotFoundError('Customer', 400);

    if (req.user.role !== 'Dispatcher' && req.user.roleObject._id.toString() !== req.params.customer_id) {
      throw new ErrorResponse('You are not allowed to update this customer', 400);
    }

    customer = await module.exports.insertOrUpdateCustomer(req);

    await User.updateOne({
      role: 'Customer',
      refToRole: req.params.customer_id,
    }, {
      $set: {
        email: req.body.email, firstName: req.body.firstName,
        lastName: req.body.lastName, phoneNumber: req.body.phoneNumber
      }
    });

    return res.status(200).json(customer);
  } catch (error) {
    return next(new ErrorResponse(error.message, 400));
  }
};
//still need to test it
exports.searchCustomers = async (req, res, next) => {
  const filter = url.parse(req.url, true).query.filter;
  const regexp = new RegExp(filter);
  let customers = await Customer.find({
    $or: [
      { firstName: regexp },
      { lastName: regexp },
      { email: regexp },
      { phoneNumber: regexp },
      { companyName: regexp }
    ]
  });
  return res.status(200).json(customers);
};