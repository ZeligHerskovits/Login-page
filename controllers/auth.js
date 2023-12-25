const { ErrorResponse, MissingRequiredError, NotFoundError, UnknownError } = require('../utils/errors');
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

  try {
    const customer = await insertOrUpdateCustomer(req);

    const user = await User.create({
      email: req.body.email,
      password: req.body.password,
      role: 'Customer',
      refToRole: customer._id,
      customer: customer._id
    });
    customer.userObject = user

    // user.roleObject._doc.phoneNumber
    const c = await Customer.findOne({ email: req.body.email }).populate('userObject');
    c.userObject._doc.role

    // const salt = await bcrypt.genSalt(10);
    // user.password = await bcrypt.hash(user.password, salt);

    const token = crypto.randomBytes(32).toString("hex");
    await Token.create({ token: token, user: user._id, type: "email" });
    console.log("token.....", token)
    // sendEmail({
    //   to: req.body.email,
    //   subject: 'Thank you for signing up!',
    //   html: `<a href="localhost:3000/auth/verify-email?token=${token}">Click here to verify your email</a>`
    // });

    return res.status(200).json("Email: " + user.email + ' - ' + "Role: " + user.role)
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

  const user = await User.findById(req.user._id)
  const i = user.roleObject._id
  const j = user.roleObject._doc.lastName
  //this is not working //const m = user.roleObject._doc.lastName = "plm"
  //so basicly to add data with the populate is not working only to see the data right ?
  await user.save();
  if (!user) return next(new NotFoundError("User", 400));
  res.status(200).send(user);
});

exports.reqPassword = async (req, res, next) => {
  const path = "localhost:3000" + "/auth/setpassword";
  let userWithThisEmail = await User.findOne({ role: req.body.role, email: req.body.email });
  if (!userWithThisEmail) {
    if (req.body.role == "Customer") {
      const customerWithThisEmail = await Customer.findOne({ billingEmail: req.body.email });
      if (!customerWithThisEmail)
        return next(new ErrorResponse(req.body.role + ' with this email does not exist', 400));
      const otherUser = await User.findOne({ email: req.body.email });
      if (otherUser)
        return next(new ErrorResponse('This email is already associated with a ' + otherUser.role, 400));

      userWithThisEmail = await User.create({ email: req.body.email, role: 'Customer', refToRole: customerWithThisEmail._id });
    }
    else {
      return next(new ErrorResponse(req.body.role + ' with this email does not exist', 400));
    }
  }
  try {
    // delete old tokens before storing new
    await Token.deleteMany({ user: userWithThisEmail, type: "password" })
    let resetToken = crypto.randomBytes(32).toString("hex");

    await Token.create({
      user: userWithThisEmail,
      token: resetToken,
      type: "password"
    });

    let html = 'Password reset request <br>'
      + `<a href="${path}?token=${resetToken}">set password</a> <br>`
      + `<p>this link will expire in 15 minutes</p>`;
    // await sendEmail({
    //   to: req.body.email,
    //   subject: 'Password Request',
    //   html: html
    // });

    // delete this token after expire time
    res.status(200).send();
  } catch (error) {

    return next(new UnknownError(error));
  }
}

//POST /auth/setPassword
exports.setPassword = async (req, res, next) => {
  let fields = checkFields(req.body, ['email', 'password'], ['email', 'password']);
  if (fields instanceof Error) return next(fields);
  const { email, password } = req.body;
  if (!req.query.token) {
    return next(new ErrorResponse("Token is required", 401));
  }
  const token = req.query.token
  const tokenExpiredTime = new Date() - 15 * 60000 // 15 minutes
  const validToken = await Token.findOne({
    token: token,
    type: "password",
    createdAt: { $gt: tokenExpiredTime },
    expired: false
  });
  if (!validToken)
    return next(new ErrorResponse('Invalid or expired token', 401))
  console.log(validToken)

  const user = await User.findOneAndUpdate(
    { _id: validToken.user, email: email },
    //{ password: await genPass(password), verified: true }
    { password: password, verified: true }
  );
  if (user) {
    await Token.deleteOne({ "token": token });
    await forceLogOut(user);
    res.status(200).send();
  } else {
    return next(new ErrorResponse("Email doesn't match", 401));
  }
}

//POST /auth/verify-email
//Verify new user
exports.verifyEmail = async (req, res, next) => {
  if (!req.body.email) {
    return next(new ErrorResponse("The email with what you registered is required", 401));
  }
  if (!req.query.token) {
    return next(new ErrorResponse("Token is required", 401));
  }
  const token = req.query.token;
  let user = await User.findOne({ email: req.body.email });
  const tokenObject = await Token.findOne({
    token: token,
    user: user._id,
    type: "email",
    expired: false
  });
  if (tokenObject) {
    await User.findByIdAndUpdate(user._id, { verified: true });
    await Token.deleteOne({ "token": token });
    return res.status(200).end();
  }
  else {
    return next(new NotFoundError('User', 400));
  }
};


//PUT /auth/changePassword
//Change password
exports.changePassword = async (req, res, next) => {
  const allowedFields = ['oldPassword', 'newPassword'];
  let error = checkFields(req.body, allowedFields, true);
  if (error) return next(error);

  const user = await User.findById(req.user._id).select('+password').populate('roleObject');
  if (!user) return next(new NotFoundError('User'));

  const isMatch = bcrypt.compareSync(req.body.oldPassword, user.password);
  console.log(req.user._id)

  if (!isMatch) return next(new ErrorResponse('Invalid Credentials', 401));
  await User.findByIdAndUpdate(
    user._id,
    { password: await genPass(req.body.newPassword) }
  );
  await forceLogOut(user)

  sendTokenResponse(user, res);
};


// web sockets is still in process to complet
const WebSocket = require('ws');

const express = require('express');
const http = require('http');


const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });


const userSocketMap = new Map();

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected.');
  const userId = req.user._id;

  if (userId) {
    // Store the WebSocket client in the map
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, []);
    }
    userSocketMap.get(userId).push(ws);

    ws.on('close', () => {
      // Remove the WebSocket client when it disconnects
      const userSockets = userSocketMap.get(userId);
      if (userSockets) {
        userSocketMap.set(userId, userSockets.filter(socket => socket !== ws));
      }
    });
  }
});

const forceLogOut = async (user) => {
  const userSockets = userSocketMap.get(user._id);
  if (userSockets) {

    const logoutMessage = {
      type: 'logout',
      message: 'You have been logged out from all devices.',
    };

    userSockets.forEach(ws => {
      ws.send(JSON.stringify(logoutMessage));
      ws.close();
    });

    // Clear the WebSocket clients for the user
    userSocketMap.delete(user._id);
  }
  await User.findByIdAndUpdate(user._id, { forcedLogOut: Date.now() });

};

exports.forceLogOut = forceLogOut;