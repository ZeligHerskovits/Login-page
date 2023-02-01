const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");
dotenv.config({ path: './config/config.env' });

// exports.PhoneField = {
//     type: String,
//     unique: true,
//     sparse: true,
//     match: [/^[0-9]*$/, 'Only number please'],
//     minlength: [10, 'Must be 10 characters long'],
//     maxlength: [10, 'Must be 10 characters long'],
//   };

const UserSchema = new mongoose.Schema(
    {
        email: {
            unique: true,
            type: String,
            lowercase: true,
            required: [true, 'Email is required'],
            // match: [/^\w+([\.\+-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
        },
        firstName: String,
        lastName: String,
        //phoneNumber: PhoneField,
        password: {
            type: String,
            select: false,
        },
        lastLogOut: Date,
        verified: { type: Boolean, default: false }
    },

    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
        selectPopulatedPaths: false,
    }
);

UserSchema.methods.getSignedJwtToken = function () {
    const payload = { user_id: this._id };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXP_TIME,
    });
    return token
};

var User = mongoose.model('User', UserSchema);
module.exports = User;