const mongoose = require('mongoose');
const { fullName } = require('../utils/fullName');

const DriverSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      unique: true,
      type: String,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
    }
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
    selectPopulatedPaths: false,
  }
);

DriverSchema.virtual('userObject', {
  localField: '_id',
  foreignField: 'refToRole',
  ref: 'User',
  justOne: true,
});

//DriverSchema.virtual('fullName').get(fullName);

module.exports = mongoose.model('Driver', DriverSchema);
