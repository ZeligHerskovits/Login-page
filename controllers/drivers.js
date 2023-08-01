const Driver = require('../models/Driver');
const User = require('../models/User');
const { NotFoundError, ErrorResponse } = require('../utils/errors');
const { checkFields } = require('../middleware/checkFields');
const Mongoose = require('mongoose');


// POST /drivers
exports.createDriver = async (req, res, next) => {

    try {
        let allowedFields = ['email', 'firstName', 'lastName', 'phoneNumber']
        let requiredFields = ['email', 'firstName', 'lastName', 'phoneNumber',]

        const fields = checkFields(req.body, allowedFields, requiredFields);
        if (fields instanceof Error) return next(fields);

        //if (req.body.email) {
        const diverWithThisEmailExists = await User.find({ role: 'Driver', email: req.body.email });
        if (diverWithThisEmailExists) return next(new ErrorResponse('User With this email exists', 400));
        const checkForDriver = await Driver.findOne({ email: req.body.email });
        if (checkForDriver) return next(new ErrorResponse('Driver with this email already exist', 400));
        else {
            const driver = await Driver.create(req.body);
            const user = await User.create({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                password: req.body.password,
                phoneNumber: req.body.phoneNumber,
                role: 'Driver',
                refToRole: driver._id
            });
            driver.userObject = user

            return res.status(200).json(driver);
        }
        // } else {
        //     const driver = await Driver.create(req.body);
        //     return res.status(200).json(driver)
        // }
    } catch (e) {
        console.log(e.stack);
        return next(new ErrorResponse(e.message, 400));
    }
};

// GET /drivers/driver_id
exports.getDriver = async (req, res, next) => {
    //let driver = await Driver.findById(req.params.driver_id).populate('userObject');
    const driverId = req.user.role === 'Dispatcher' ? req.params.driver_id : req.user.refToRole;

    let driver = await Driver.findById({ _id: driverId }).populate('userObject');
    if (!driver) return next(new NotFoundError('Driver'));

    return res.status(200).json(driver);
};

// GET /drivers
exports.getDrivers = async (req, res, next) => {
    const results = await Driver.find();

    return res.status(200).json(results);
};

// DELETE /drivers/driver_id
exports.deleteDriver = async (req, res, next) => {
    //const driver = await Driver.findByIdAndDelete(req.params.driver_id);
    const driver = await Driver.deleteOne({ _id: req.params.driver_id });
    if (!driver) return next(new NotFoundError('Driver'));

    await User.deleteOne({
        role: 'Driver',
        refToRole: Mongoose.Types.ObjectId(req.params.driver_id),
    });
    return res.status(200).end();
};

// PUT /drivers/driver_id
exports.updateDriver = async (req, res, next) => {

    let allowedFields = ['email', 'firstName', 'lastName', 'phoneNumber']

    const fields = checkFields(req.body, allowedFields);
    if (fields instanceof Error) return next(fields);
    if (Object.keys(req.body).length === 0) return next(new ErrorResponse(JSON.stringify('Nothing to update'), 400));

    const driverId = req.user.role === 'Dispatcher' ? req.params.driver_id : req.user.refToRole.toString();
    console.log('driverId', driverId)

    let driver = await Driver.findById(driverId);
    if (!driver) return next(new NotFoundError('Driver'));

    if (req.user.role !== 'Dispatcher' && req.user.roleObject._id.toString() !== driverId) {
        return next(new ErrorResponse('You are not allowed to update this driver', 400));
    }

    //if (req.body.email) {
    let userForDriverExists = await User.findOne({ role: 'Driver', refToRole: driver._id });
    if (!userForDriverExists) {
        await User.create({
            email: req.body.set.email,
            refToRole: driver.id,
            role: 'Driver'
        })
    }
    else {
        await User.findOneAndUpdate({ role: 'Driver', refToRole: driver._id }, { email: req.body.set.email || req.body.unset.email })
    }
    //}
    let update = {
        $set: { ...req.body },
        //$unset: { ...req.body.unset },
        // $push: { ...req.body.push },
    };

    driver = await Driver.findByIdAndUpdate(driver._id, update, { new: true, runValidators: true }).populate('userObject');
    return res.status(200).json(driver);
};
//still need to test it
exports.searchDrivers = async (req, res, next) => {
    const filter = url.parse(req.url, true).query.filter;
    const regexp = new RegExp(filter);
    let drivers = await Driver.find({
        $or: [
            { firstName: regexp },
            { lastName: regexp },
            { email: regexp },
            { phoneNumber: regexp }
        ]
    });
    return res.status(200).json(drivers)
};