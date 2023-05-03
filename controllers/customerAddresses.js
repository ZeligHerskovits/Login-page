const CustomerAddress = require('../models/CustomerAddress');
const Customer = require('../models/Customer');
const { NotFoundError } = require('../utils/errors');
const { checkFields } = require('../middleware/checkFields');
const Zone = require('../models/Zone');

// POST /customersAddresses
// Permissions: Dispatcher,Customer
// Creates New CustomerAddress
exports.createCustomerAddress = async (req, res, next) => {
    const fields = checkFields(req.body, ['customer', 'location'], ['customer', 'location']);
    if (fields instanceof Error) return next(fields);
    // if (error) return next(error);
    // error = checkFields(req.body.location, [
    //     'coordinates',
    //     'formattedAddress',
    //     'street',
    //     'streetLine2',
    //     'city',
    //     'state',
    //     'zipCode',
    // ]);
    // if (error) return next(error);
    // const fields = checkFields(req.body, allowedFields, requiredFields);
    //     if (fields instanceof Error) return next(fields);
    const customerId = req.user.role === 'Dispatcher' ? req.body.customer : req.user.roleObject._id;

    if (req.user.role === 'Dispatcher') {
        const customer = await Customer.findById(req.body.customer);

        if (!customer) {
            return next(new NotFoundError('Customer', 400));
        }
    }

    if (!req.body.location.formattedAddress) {
        const address = req.body.location;
        req.body.location.formattedAddress = (address.street)
            + (address.streetLine2 ? ' ' + address.streetLine2 : '')
            + (address.city ? ' ' + address.city : '')
            + (address.state ? ', ' + address.state : '')
            + (address.zipCode ? ' ' + address.zipCode : '');
    }

    //const zoneId = await checkZone(req.body)

    const customerAddress = await CustomerAddress.create({
        ...req.body,
        customer: customerId,
        //zone: zoneId
    });

    return res.status(200).json(customerAddress);
};

// GET /customersAddresses/:customerAddress_id
// Permissions: Dispatcher,Customer
// Get CustomerAddress By ID
exports.getCustomerAddress = async (req, res, next) => {
    let customerAddress = await CustomerAddress.findById(req.params.customerAddress_id);

    if (!customerAddress) return next(new NotFoundError('CustomerAddress'));

    if (req.user.role !== 'Dispatcher' && req.user.roleObject._id.toString() !== customerAddress.customer.toString()) {
        return next(new NotFoundError('CustomerAddress'));
    }

    return res.status(200).json(customerAddress);
};

// GET /customersAddresses
// Permissions: Dispatcher,Customer
// Get All CustomerAddresses
exports.getCustomerAddresses = async (req, res, next) => {
    const queries = {
        ...req.query,
    };
    if (req.user.role !== 'Dispatcher') {
        queries.customer = req.user.roleObject._id;
    }
    const results = await  CustomerAddress.find();

    return res.status(200).json(results);
};

// DELETE /customersAddresses/:customerAddress_id
// Permissions: Dispatcher,Customer
// Deletes CustomerAddress By ID
exports.deleteCustomerAddress = async (req, res, next) => {
    //const customerAddress = await CustomerAddress.findByIdAndDelete(req.params.customerAddress_id);
    const customerAddress = (await CustomerAddress.findById(req.params.customerAddress_id)).delete();

    if (!customerAddress) return next(new NotFoundError('CustomerAddress'));

    if (req.user.role !== 'Dispatcher' && req.user.roleObject._id.toString() !== customerAddress.customer.toString()) {
        return next(new NotFoundError('CustomerAddress'));
    }

    return res.status(200).end();
};

// PUT /customersAddresses/:customerAddress_id
// Permissions: Dispatcher,Customer
// Updates CustomerAddress By ID
exports.updateCustomerAddress = async (req, res, next) => {
    let error = checkFields(req.body, ['customer', 'nickname', 'createdFor', 'location']);
    if (error) return next(error);
    if (req.body.location) {
        error = checkFields(req.body.location, [
            'coordinates',
            'formattedAddress',
            'street',
            'streetLine2',
            'city',
            'state',
            'zipCode',
        ]);
    }
    if (error) return next(error);

    let customerAddress = await CustomerAddress.findById(req.params.customerAddress_id);
    if (!customerAddress) return next(new NotFoundError('CustomerAddress'));

    if (req.user.role !== 'Dispatcher' && req.user.roleObject._id.toString() !== customerAddress.customer.toString()) {
        return next(new NotFoundError('CustomerAddress'));
    }

    if (!req.body.location.formattedAddress) {
        const address = req.body.location;
        req.body.location.formattedAddress = (address.street)
            + (address.streetLine2 ? ' ' + address.streetLine2 : '')
            + (address.city ? ' ' + address.city : '')
            + (address.state ? ', ' + address.state : '')
            + (address.zipCode ? ' ' + address.zipCode : '');
    }
    //const zoneId = await checkZone(req.body)

    customerAddress = await CustomerAddress.findByIdAndUpdate(req.params.customerAddress_id, { ...req.body, zone: zoneId }, {
        new: true,
        runValidators: true,
    });

    return res.status(200).json(customerAddress);
};

async function checkZone(body) {
    const zones = await Zone.find();

    for (let value of zones) {
        let temp = value.zipCodes.includes(body.location.zipCode);

        if (temp) {
            var zoneId = value._id;
            return zoneId;
        }
    }
}

