const express = require('express');
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });
const { checkToken } = require('../middleware/auth')

const {
    login,
    logout,
    register,
    getUser
} = require('../controllers/auth');

const {
    createCustomer
} = require('../controllers/customers');

//auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', checkToken, logout);
router.get('/auth/me', checkToken, getUser);

//customer
//router.post('/customer', checkToken, createCustomer)

module.exports = router;
