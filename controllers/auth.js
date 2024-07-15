const {
  ErrorResponse,
  MissingRequiredError,
  NotFoundError,
  UnknownError,
} = require("../utils/errors");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const Token = require("../models/Token");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });
const { checkFields } = require("../middleware/checkFields");
const { insertOrUpdateCustomer } = require("../controllers/customers");
const { Error } = require("mongoose");
const Customer = require("../models/Customer");
const { createTransporter, sendEmail } = require("../utils/emailConfig");
const transporter = createTransporter();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// POST /auth/register
exports.register = async (req, res, next) => {
  try {
    const customer = await insertOrUpdateCustomer(req);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const user = await User.create({
      email: req.body.email,
      password: hashedPassword,
      role: "Customer",
      refToRole: customer._id,
      customer: customer._id,
    });
    customer.userObject = user;

    // user.roleObject._doc.phoneNumber
    const c = await Customer.findOne({ email: req.body.email }).populate(
      "userObject"
    );
    c.userObject._doc.role;

    const token = crypto.randomBytes(32).toString("hex");
    await Token.create({ token: token, user: user._id, type: "email", verified: false });

    const mailOptions = {
      from: "zeligh4762@gmail.com",
      to: user.email,
      subject: "You Have Registered Successfully!",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
              <tr>
                <td align="center" bgcolor="#4CAF50" style="padding: 40px 0 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                  Welcome to Our Service!
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="color: #333333; font-size: 18px;">
                        <b>Hello ${user.name},</b>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                        Thank you for registering with us! To complete your registration, please verify your email address by clicking the link below and then you can login below.
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 20px 0 30px 0;">
                        <a href="http://localhost:3000/auth/verify-email?token=${token}&email=${user.email}" style="background-color: #4CAF50; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Verify Your Email</a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 20px 0 30px 0;">
                        <a href="http://127.0.0.1:5500/html/login.html" style="background-color: #4CAF50; color: #ffffff; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-size: 16px;">Login</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                        If you did not create an account, please ignore this email or contact our support team.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#4CAF50" style="padding: 30px 30px 30px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="color: #ffffff; font-size: 14px;">
                        &copy; 2024 Your Company. All rights reserved.
                        <br>
                        Visit us at <a href="http://www.yourcompany.com" style="color: #ffffff;">www.yourcompany.com</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };
    
    sendEmail(transporter, mailOptions);

    return res
      .status(200)
      .json("You successfully get registered " + "Email: " + user.email + ' - ' + "Role: " + user.role);
  } catch (e) {
    // if (e.code === 11000 && e.message.includes("duplicate key error")) {
    //     return next(new ErrorResponse('Customer with this id already exists', 400));
    // } else {
    //return next( new Error(`Error: ${e.message}   errorCode: ${e.code }`));
    console.log(e.stack);
    return next(new ErrorResponse(e.message, 400));
    //}
  }
};

// POST /auth/login
exports.login = async (req, res, next) => {
  let fields = checkFields(req.body,["email", "password"],["email", "password"]);
  if (fields instanceof Error) return next(fields);

  const { email, password } = fields;
  let user = await User.findOne({ email }).select("+password");
  if (!user) return next(new ErrorResponse("Invalid email", 400));

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return next(new ErrorResponse("Invalid password", 400));

  user = await User.findOne({ _id: user._id, verified: true });
  if (!user) return next(new ErrorResponse("You must verify your email before loging in", 400));

  const token = user.getSignedJwtToken();

  const mailOptions = {
    from: "zeligh4762@gmail.com",
    to: user.email,
    subject: "Login Confirmation",
    text: "You have successfully logged in.",
    html: `
    <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
          <tr>
            <td align="center" bgcolor="#4CAF50" style="padding: 40px 0 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
              Login Confirmation
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="color: #333333; font-size: 18px;">
                    <b>Hello ${user.name},</b>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                    You have successfully logged in to your account.
                    <br><br>
                    If you did not log in, please contact our support team immediately.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                    Thank you for using our service!
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#4CAF50" style="padding: 30px 30px 30px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="color: #ffffff; font-size: 14px;">
                    &copy; 2024 Your Company. All rights reserved.
                    <br>
                    Visit us at <a href="http://www.yourcompany.com" style="color: #ffffff;">www.yourcompany.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
  };

  sendEmail(transporter, mailOptions);

  return res
    .cookie("token", token, {
      expires: new Date(Date.now() + process.env.JWT_EXP_TIME * 86400000),
      domain: process.env.DOMAIN,
      httpOnly: true,
    })
    .status(200).json({ token: token, message: "Logged in successfully" });
  //res.header('x-user-token', token).status(200).send('You have sucsesfully loged in')
};

// POST /auth/logout
exports.logout = async (req, res, next) => {
  const options = {
    expires: new Date(0),
    httpOnly: true,
    domain: process.env.DOMAIN,
    path: "/",
    //secure: process.env.SECURE_COOKIE === 'true', // Ensure this is boolean
    //sameSite: process.env.SAME_SITE || 'Lax', // Default to 'Lax' if not set
  };
  return res
    .clearCookie("token", options)
    .status(200)
    .json({ message: "You have successfully Loged out" });
  // res.header('x-user-token', '').status(200).send('You have sucsesfully loged out')
  // res.status(200).cookie('token', '', options).end();
};

// GET /auth/me
exports.getUser = async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const i = user.roleObject._id;
  const j = user.roleObject._doc.lastName;
  //this is not working //const m = user.roleObject._doc.lastName = "plm"
  //so basicly to add data with the populate is not working only to see the data right ?
  await user.save();
  if (!user) return next(new NotFoundError("User", 400));
  res.status(200).send(user);
};

// POST /auth/reqpassword
exports.reqPassword = async (req, res, next) => {
  const path = "localhost:3000" + "/auth/setpassword";
  //let userWithThisEmail = await User.findOne({ role: req.body.role, email: req.body.email });
  let userWithThisEmail = await User.findOne({ email: req.body.email });
  if (!userWithThisEmail) {
    return next(
      new ErrorResponse("a user with this email does not exist", 400)
    );
  }
  // if (!userWithThisEmail) {
  //   if (req.body.role == "Customer") {
  //     const customerWithThisEmail = await Customer.findOne({ email: req.body.email });
  //     if (!customerWithThisEmail)
  //       return next(new ErrorResponse(req.body.role + ' with this email does not exist', 400));
  //     const otherUser = await User.findOne({ email: req.body.email });
  //     if (otherUser)
  //       return next(new ErrorResponse('This email is already associated with a ' + otherUser.role, 400));

  //     userWithThisEmail = await User.create({ email: req.body.email, role: 'Customer', refToRole: customerWithThisEmail._id });
  //   }
  //   else {
  //     return next(new ErrorResponse(req.body.role + ' with this email does not exist', 400));
  //   }
  // }
  try {
    await Token.deleteMany({ user: userWithThisEmail._id, type: "password" });
    let resetToken = crypto.randomBytes(32).toString("hex");

    await Token.create({
      user: userWithThisEmail._id,
      token: resetToken,
      type: "password",
    });
    const resetPasswordLink = `http://127.0.0.1:5500/html/create-new-password.html?token=${resetToken}`;

    const mailOptions = {
      from: "zeligh4762@gmail.com",
      to: req.body.email,
      subject: "Password Reset Request",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
              <tr>
                <td align="center" bgcolor="#ffcc00" style="padding: 40px 0 30px 0; color: #000000; font-size: 28px; font-weight: bold;">
                  Password Reset Request
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="color: #333333; font-size: 18px;">
                        <b>Hello,</b>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                        You requested a password reset. Click the link below to reset your password.
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 20px 0 30px 0;">
                        <a href="${resetPasswordLink}" style="background-color: #ffcc00; color: #000000; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Reset Password</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                        If you did not request a password reset, please ignore this email or contact our support team.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffcc00" style="padding: 30px 30px 30px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="color: #000000; font-size: 14px;">
                        &copy; 2024 Your Company. All rights reserved.
                        <br>
                        Visit us at <a href="http://www.yourcompany.com" style="color: #000000;">www.yourcompany.com</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

    sendEmail(transporter, mailOptions);

    res.status(200).send({ message: "Password reset email sent" });
  } catch (error) {
    return next(new UnknownError(error));
  }
};

//POST /auth/setPassword
exports.setPassword = async (req, res, next) => {

  let fields = checkFields(req.body,["email", "password"],["email", "password"]);
  if (fields instanceof Error) return next(fields);

  const { email, password } = req.body;

  if (!req.query.token) {
    return next(new ErrorResponse("Token is required", 401));
  }

   const token = req.query.token;
   const tokenExpiredTime = new Date() - 15 * 60000; // 15 minutes
   const validToken = await Token.findOne({
     token: token,
     type: "password",
     createdAt: { $gt: tokenExpiredTime },
     expired: false,
   });

   if (!validToken)
     return next(new ErrorResponse("Invalid or expired token", 401));

   console.log(validToken);

   const salt = await bcrypt.genSalt(10);
   const hashedPassword = await bcrypt.hash(password, salt);
   const userId = new mongoose.Types.ObjectId(validToken.user._id);

   const user = await User.findOneAndUpdate(
     { _id: userId, email: email },
     { password: hashedPassword, verified: true }
   );

  if (user) {
    //await Token.deleteOne({ token: token });
    
    const mailOptions = {
      from: "zeligh4762@gmail.com",
      to: email,
      subject: "Password Reset Successful!",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
              <tr>
                <td align="center" bgcolor="#4CAF50" style="padding: 40px 0 30px 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                  Password Reset Successful
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="color: #333333; font-size: 18px;">
                        <b>Hello,</b>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                        Your password has been successfully reset. You can now log in with your new password by clicking the link below.
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 20px 0 30px 0;">
                        <a href="http://127.0.0.1:5500/html/login.html" style="background-color: #4CAF50; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Log In</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                        If you did not perform this action, please contact our support team immediately.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#4CAF50" style="padding: 30px 30px 30px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="color: #ffffff; font-size: 14px;">
                        &copy; 2024 Your Company. All rights reserved.
                        <br>
                        Visit us at <a href="http://www.yourcompany.com" style="color: #ffffff;">www.yourcompany.com</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

   sendEmail(transporter, mailOptions);
    //await forceLogOut(user);
    res.status(200).send({ message: "New password set successfully" });
  } else {
    return next(new ErrorResponse("Email doesn't match", 401));
  }
};

//Get /auth/verify-email
//Verify new user
exports.verifyEmail = async (req, res, next) => {
  if (!req.query.email) {
    return next(
      new ErrorResponse("The email with what you registered is required", 401)
    );
  }
   if (!req.query.token) {
     return next(new ErrorResponse("Token is required", 401));
  }

   const token = req.query.token;
   let user = await User.findOne({ email: req.query.email });
   const tokenObject = await Token.findOne({
     token: token,
     user: user._id,
     type: "email",
     expired: false,
   });

   if (tokenObject) {
     await User.findByIdAndUpdate(user._id, { verified: true });
     //await Token.deleteOne({ token: token });
     return res.status(200).send({message: "You successfully verified your email"});
   } else {
     return next(new NotFoundError("User", 400));
   }
};

//PUT /auth/changePassword
//Change password
exports.changePassword = async (req, res, next) => {
   const allowedFields = ["oldPassword", "newPassword"];
   let error = checkFields(req.body, allowedFields, true);
   if (error) return next(error);

   const user = await User.findById(req.user._id)
     .select("+password")
     .populate("roleObject");
   if (!user) return next(new NotFoundError("User"));

   const isMatch = bcrypt.compareSync(req.body.oldPassword, user.password);
   if (!isMatch) return next(new ErrorResponse("Invalid Credentials", 401));
   await User.findByIdAndUpdate(user._id, {
     password: await genPass(req.body.newPassword),
   });

   //await forceLogOut(user);

   sendTokenResponse(user, res);
};


// web sockets is still in process to complet
const WebSocket = require("ws");

const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const userSocketMap = new Map();

wss.on("connection", (ws, req) => {
  console.log("WebSocket client connected.");
  const userId = req.user._id;

  if (userId) {
    // Store the WebSocket client in the map
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, []);
    }
    userSocketMap.get(userId).push(ws);

    ws.on("close", () => {
      // Remove the WebSocket client when it disconnects
      const userSockets = userSocketMap.get(userId);
      if (userSockets) {
        userSocketMap.set(
          userId,
          userSockets.filter((socket) => socket !== ws)
        );
      }
    });
  }
});

const forceLogOut = async (user) => {
  const userSockets = userSocketMap.get(user._id);
  if (userSockets) {
    const logoutMessage = {
      type: "logout",
      message: "You have been logged out from all devices.",
    };

    userSockets.forEach((ws) => {
      ws.send(JSON.stringify(logoutMessage));
      ws.close();
    });

    // Clear the WebSocket clients for the user
    userSocketMap.delete(user._id);
  }
  await User.findByIdAndUpdate(user._id, { forcedLogOut: Date.now() });
};

exports.forceLogOut = forceLogOut;
