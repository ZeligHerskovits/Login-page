const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });

const UserSchema = new mongoose.Schema(
    {
        email: {
            unique: true,
            type: String,
            lowercase: true,
        },
        password: {
            type: String,
            select: false,
        },
        refToRole: {
            type: mongoose.Types.ObjectId,
            required: true,
            refPath: 'role',
        },
        role: {
            type: String,
            enum: ['Customer', 'Dispatcher', 'Driver'],
            default: 'Customer',
        },
        lastLogOut: Date,
        forcedLogOut: Date,
        verified: { type: Boolean, default: false }
    },

    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
        selectPopulatedPaths: false,
    }
);
// a virtual field I dont need to populate in order to get the data from it
UserSchema.virtual('roleObject', {
    ref: function () {
        return this.role;
    },
    localField: 'refToRole',
    foreignField: '_id',
    justOne: true,
});

UserSchema.methods.getSignedJwtToken = function () {
    const payload = { user_id: this._id };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXP_TIME,
    });
};

var User = mongoose.model('User', UserSchema);
module.exports = User;