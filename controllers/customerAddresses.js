const CustomerAddress = require('../models/CustomerAddress');
const Customer = require('../models/Customer');
const { NotFoundError } = require('../utils/errors');
const { checkFields } = require('../middleware/checkFields');
const Zone = require('../models/Zone');

// POST /customersAddress
exports.createCustomerAddress = async (req, res, next) => {
    let fields = checkFields(req.body, ['customer', 'location'], ['customer', 'location']);
    if (fields instanceof Error) return next(fields);
    if (req.body.location) {
        fields = checkFields(req.body.location, [
            'formattedAddress',
            'street',
            'city',
            'state',
            'zipCode',
        ]);
    }
    if (fields instanceof Error) return next(fields);

    const { customerName, customerEmail } = req.body;
    let customerId;
    if (req.user.role === 'Dispatcher') {
        const customer = await Customer.findOne({
            $or: [
                { name: { $regex: new RegExp(customerName, 'i') } },
                { email: { $regex: new RegExp(customerEmail, 'i') } }
            ]
        });
        
        if (!customer) {
            return next(new NotFoundError('Customer not found', 400));
        }

        customerId = customer._id;
    }
    else {
        customerId = req.user.roleObject._id;
    }

    if (!req.body.location.formattedAddress) {
        const address = req.body.location;
        req.body.location.formattedAddress = (address.street)
            + (address.streetLine2 ? ' ' + address.streetLine2 : '')
            + (address.city ? ' ' + address.city : '')
            + (address.state ? ', ' + address.state : '')
            + (address.zipCode ? ' ' + address.zipCode : '');
    }

    const zoneId = await checkZone(req.body)

    const customerAddress = await CustomerAddress.create({
        ...req.body,
        customer: customerId,
        zone: zoneId
    });

    return res.status(200).json(customerAddress);
};

// GET /customersAddress/customerAddress_id
exports.getCustomerAddress = async (req, res, next) => {
    let customerAddress = await CustomerAddress.findById(req.params.customerAddress_id);

    if (!customerAddress) return next(new NotFoundError('CustomerAddress'));

    if (req.user.role !== 'Dispatcher' && req.user.roleObject._id.toString() !== customerAddress.customer.toString()) {
        return next(new NotFoundError('CustomerAddress'));
    }

    return res.status(200).json(customerAddress);
};

// GET /customersAddresses
exports.getCustomerAddresses = async (req, res, next) => {
    // const queries = {
    //     ...req.query,
    // };
    // if (req.user.role !== 'Dispatcher') {
    //     queries.customer = req.user.roleObject._id;
    // }
    const results = await CustomerAddress.find();

    return res.status(200).json(results);
};

// DELETE /customersAddress/customerAddress_id
exports.deleteCustomerAddress = async (req, res, next) => {

    const customerAddress = await CustomerAddress.findByIdAndDelete(req.params.customerAddress_id);
    if (!customerAddress) return next(new NotFoundError('CustomerAddress'));

    if (req.user.role !== 'Dispatcher' && req.user.roleObject._id.toString() !== customerAddress.customer.toString()) {
        return next(new NotFoundError('CustomerAddress'));
    }

    return res.status(200).json("This address has been successfully deleted", customerAddress);
};

// PUT /customersAddresses/customerAddress_id
exports.updateCustomerAddress = async (req, res, next) => {
    let fields = checkFields(req.body, ['customer', 'location']);
    if (fields instanceof Error) return next(fields);
    if (req.body.location) {
        fields = checkFields(req.body.location, [
            'formattedAddress',
            'street',
            'city',
            'state',
            'zipCode',
        ]);
    }
    if (fields instanceof Error) return next(fields);

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
    const zoneId = await checkZone(req.body)

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

