const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const dotenv = require("dotenv");
const { json } = require('express');
dotenv.config({ path: './config/config.env' });
const cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }))

mongoose.connect('mongodb://localhost/forLogin', { useNewUrlParser: true })
  .then(() => console.log('connected to MongoDB...'))
  .catch(err => console.err('Could not connect to mongoDB', err))


// exports.PhoneField = {
//     type: String,
//     unique: true,
//     sparse: true,
//     match: [/^[0-9]*$/, 'Only number please'],
//     minlength: [10, 'Must be 10 characters long'],
//     maxlength: [10, 'Must be 10 characters long'],
//   };

const UserSchema = new mongoose.Schema(
  {
    email: {
      unique: true,
      type: String,
      lowercase: true,
      required: [true, 'Email is required'],
      match: [/^\w+([\.\+-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    },
    firstName: String,
    lastName: String,
    //phoneNumber: PhoneField,
    password: {
      type: String,
      select: false,
    },
    lastLogOut: Date,
    forcedLogOut: Date,
    verified: { type: Boolean, default: false }
  },

);

UserSchema.methods.getSignedJwtToken = function () {
  const payload = { user_id: this._id };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXP_TIME,
  });
  return token
};

var User = mongoose.model('User', UserSchema);
module.exports = User;

const TokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    token: {
      type: String,
      select: false,
    },
    expired: {
      type: Boolean,
      default: false
    },
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
    selectPopulatedPaths: false,
  }
);

var Token = mongoose.model('Token', TokenSchema);
module.exports = Token;

app.post('/auth/register', async (req, res) => {

  let user = await User.findOne({ email: req.body.email })
  if (user) return res.status(400).send('user already exist')

  user = await User.create({
    email: req.body.email, password: req.body.password, firstName: req.body.firstName, lastName: req.body.lastName
  });

  // const salt = await bcrypt.genSalt(10);
  // user.password = await bcrypt.hash(user.password, salt);

  const token = crypto.randomBytes(32).toString("hex");
  await Token.create({ token: token, user: user._id });

  // sendEmail({
  //   to: req.body.email,
  //   subject: 'Thank you for signing up!',
  //   html: `<a href="${process.env.FRONT_END_URL}/verify-email?token=${token}">Click here to verify your email</a>`
  // });

  return res.status(200).json(user);
});

app.post('/auth/login', async (req, res, next) => {

  const { email, password } = req.body;

  const user = await User.findOne({ email }, 'password');
  if (!user) return res.status(400).send('Invalid email or password')
  //throw Error("Enter your error message here");

  //  const isMatch = bcrypt.compare(req.body.password, user.password);
  //  if (!isMatch) return res.status(400).send('Invalid email or password')

  const token = user.getSignedJwtToken();

  return res
    .cookie("token", token, {
      //expires: new Date(Date.now() + process.env.JWT_EXP_TIME * 86400000),
      domain: process.env.DOMAIN,
      httpOnly: true,
    })
    .status(200)
    .json({ message: "Logged in successfully" });
  //res.header('x-user-token', token).status(200).send('You have sucsesfully loged in')

});

app.post("/auth/logout", async (req, res) => {

  // const token = req.header('x-user-token')
  // if (!token) return res.status(400).send('no token provid it')


  const token = req.cookies.token;
  if (!token) return res.status(400).send('Pls enter the token')
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  }
  catch (ex) {
    return res.status(400).send('Invalid token')
  }
  // res.header('x-user-token', '').status(200).send('You have sucsesfully loged out')
  // console.log("here2....")
  return res
    .clearCookie("token")
    .status(200)
    .json({ message: "successfully Logged out" });
  // const options = {
  //  // var seconds = new Date().getTime() / 1000;
  //   expires: new Date(0),
  // };

  // res.status(200).cookie('token', '', options).end();
});

app.get("/me", async (req, res) => {

  const token = req.header('x-user-token')
  if (!token) return res.status(400).send('Pls enter the token')
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  }
  catch (ex) {
    return res.status(400).send('Invalid token')
  }
  const user = await User.findById(req.user._id).select('-password')
  console.log("user")
  if (!user) res.status(404).send("no user found");
  res.status(200).send(user);
});




function checkToken(req, res, next) {

  let token;
  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (!token) return res.status(400).send('no token provid it')

  //const token = req.header('x-user-token')
  //if (!token) return res.status(400).send('no token provid it')
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  }
  catch (ex) {
    return res.status(400).send('Invalid token')
  }
}
module.exports = checkToken

app.listen(3000, () => console.log(`App is running on port 3000`));