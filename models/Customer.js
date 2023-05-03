const mongoose = require('mongoose');
//const { fullName } = require('../utils/fullName');

const CustomerSchema = new mongoose.Schema(
    {
        email: {
            unique: true,
            type: String,
            lowercase: true,
        },
        firstName: String,
        lastName: String,
        companyName: String,
        phoneNumber: {
            type: String,
        },
        verified: { type: Boolean, default: false },
        // I need to remove this role
        role: {
            type: String,
            default: 'Customer'
        }
    },

    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
        selectPopulatedPaths: false,
    },

    // { strict: true }
);

// CustomerSchema.virtual('addresses', {
//     localField: '_id',
//     foreignField: 'customer',
//     ref: 'CustomerAddress',
// });

//give me the user (which we do with going to user with ref) which his refToRole id (the user schema has a field refToRole) is the same from my id (which now im by customer)
CustomerSchema.virtual('userObject', {
    localField: '_id',
    foreignField: 'refToRole',
    ref: 'User',
    justOne: true,
});

//CustomerSchema.virtual('fullName').get(fullName);

const Customer = mongoose.model('Customer', CustomerSchema);
module.exports = Customer;


