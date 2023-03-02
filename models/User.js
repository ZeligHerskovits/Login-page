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
            //required: [true, 'Email is required'],
            //match: [/^\w+([\.\+-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
        },
        firstName: String,
        lastName: String,
        phoneNumber: {
            type: String,
            //required: [true, 'phoneNumber is required'],
        },
        //phoneNumber: PhoneField,
        password: {
            type: String,
            select: false,
        },
        verified: { type: Boolean, default: false },
        //we need to take out this customer 
        customer: {
            type: mongoose.Types.ObjectId,
            ref: 'Customer',
            required: true,
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
    },

    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
        selectPopulatedPaths: false,
    }
);

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

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXP_TIME,
    });
    return token
};

var User = mongoose.model('User', UserSchema);
module.exports = User;