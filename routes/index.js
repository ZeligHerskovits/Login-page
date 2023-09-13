const express = require('express');
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });
const { checkToken } = require('../middleware/auth');

const {
    login,
    logout,
    register,
    getUser,
    reqPassword,
    setPassword,
    verifyEmail
} = require('../controllers/auth');

const {
    createCustomer,
    getCustomer,
    getCustomers,
    deleteCustomer,
    updateCustomer
} = require('../controllers/customers');

const {
    createDriver,
    getDriver,
    getDrivers,
    deleteDriver,
    updateDriver
} = require('../controllers/drivers');

const {
    createTrip,
    getTrip,
    getTrips,
    dispatchTrip,
    dispatchMultTrips,
    updateTrip,
    updateTrips,
    deleteTrip,
    deleteMultTrips
} = require('../controllers/trips');

const {
    createCustomerAddress,
    getCustomerAddress,
    getCustomerAddresses,
    updateCustomerAddress,
    deleteCustomerAddress
} = require('../controllers/customerAddresses');

const {
    getZones,
    addZone,
    editZone,
    deleteZone
} = require('../controllers/zones');

//auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', checkToken, logout);
router.post('/auth/reqpassword', reqPassword);
router.post('/auth/setpassword', setPassword);
router.post('auth/verify-email', verifyEmail);
router.get('/auth/me', checkToken, getUser);

//customers
router.post('/customer', checkToken, createCustomer);
router.get('/customer/:customer_id', checkToken, getCustomer);
router.get('/customers', checkToken, getCustomers);
router.delete('/customer/:customer_id', checkToken, deleteCustomer);
router.put('/customer/:customer_id', checkToken, updateCustomer);

//drivers
router.post('/driver', checkToken, createDriver);
router.get('/driver/:driver_id', checkToken, getDriver);
router.get('/drivers', checkToken, getDrivers);
router.delete('/driver/:driver_id', checkToken, deleteDriver);
router.put('/driver/:driver_id', checkToken, updateDriver);

//trips
router.post('/trip', checkToken, createTrip);
router.get('/trip/:trip_id', checkToken, getTrip);
router.get('/trips', checkToken, getTrips);
router.post('/trips/:trip_id/dispatch', checkToken, dispatchTrip);
router.post('/trips/dispatch', checkToken, dispatchMultTrips);
router.put('/trip/:trip_id', checkToken, updateTrip);
router.put('/trips', checkToken, updateTrips);
router.delete('/trip/:trip_id', checkToken, deleteTrip);
router.delete('/trips', checkToken, deleteMultTrips);

//customerAddresses
router.post('/customerAddress', checkToken, createCustomerAddress);
router.get('/customerAddress/:customerAddress_id', checkToken, getCustomerAddress);
router.get('/customerAddresses', checkToken, getCustomerAddresses);
router.delete('/customerAddress/:customerAddress_id', checkToken, deleteCustomerAddress);
router.put('/customerAddress/:customerAddress_id', checkToken, updateCustomerAddress);

//zones
router.post('/zone', checkToken, addZone);
router.get('/zones', checkToken, getZones);
router.delete('/zone/:zone_id', checkToken, deleteZone);
router.put('/zone/:zone_id', checkToken, editZone);

module.exports = router;