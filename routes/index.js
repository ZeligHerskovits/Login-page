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

//auth
router.get('/auth/me', checkToken, getUser);
router.post('/auth/logout', checkToken, logout);
router.post('/auth/login', login);
router.post('/auth/register', register);

module.exports = router;
