const express = require('express');
var docs = require("express-mongoose-docs");
const mongoose = require('mongoose');
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });
const cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const { errorHandler } = require('./middleware/errorHandler');
const app = express();
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const cors = require('cors');
app.use(cors());
//const http = require('http');
//const server = http.createServer(app);
const path = require('path');
docs(app); // 2nd param is optional
app.use('/docs', express.static(path.join(__dirname, 'docs')));
//server.listen(PORT, console.log(`Server running on port 3000`));
mongoose.connect('mongodb://localhost/loginPage', { useNewUrlParser: true })
  .then(() => console.log('connected to MongoDB...'))
  .catch(err => console.err('Could not connect to mongoDB', err))

  

const router = require('./routes');
app.use(router);
app.use('/', (req, res) => res.status(200).send('Server is running'));

app.use(errorHandler);

app.listen(3000, () => console.log(`App is running on port 3000`));



