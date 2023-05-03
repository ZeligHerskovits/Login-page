const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema(
    {
        refToCreatedBy: {
            type: mongoose.Types.ObjectId,
            required: true,
            refPath: 'createdByUserRole',
        },
        customerNotified: Boolean,
        createdByUserRole: {
            type: String,
            enum: ['Customer', 'Dispatcher'],
            required: true,
        },
        driver: {
            type: mongoose.Types.ObjectId,
            ref: 'Driver',
        },
        pickupAddress: {
            type: mongoose.Types.ObjectId,
            ref: 'CustomerAddress',
        },
        dropoffAddress: {
            type: mongoose.Types.ObjectId,
            ref: 'CustomerAddress',
        },
        tripScheduleTime: { type: Date, default: Date.now },
        dispatchTime: { type: Date },
        completedTime: { type: Date },
        pickupName: String,
        dropoffName: String,
        pickupPhone: Number,
        dropoffPhone: Number,
        customer: {
            type: mongoose.Types.ObjectId,
            ref: 'Customer',
        },
        price: Number,
        pickupNote: String,
        dropoffNote: String,
        paymentStatus: {
            type: String,
            enum: ['paid', 'unpaid', 'invoiced'],
            default: 'unpaid',
        },
        status: {
            type: String,
            enum: ['waiting-for-driver', 'driver-assigned', 'picked-up', 'droped-off', 'cancelled', 'on-hold'],
            default: 'waiting-for-driver',
        },
        priority: {
            type: String,
            enum: ['normal', 'rush', 'urgent'],
            default: 'normal',
        },
        timeline: [
            {
                timestamp: { type: Date, default: Date.now },
                userid: { type: mongoose.Types.ObjectId, ref: 'user' },
                userrole: { type: String, default: 'Dispatcher' },
                updates: [{ field: String, value: String }],
                event: String,
            },
        ]
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
        selectPopulatedPaths: false,
    }
);

const Trip = mongoose.model('trip', TripSchema);
module.exports = Trip;
