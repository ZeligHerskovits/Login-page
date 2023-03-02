const mongoose = require('mongoose');
const { fullName } = require('../utils/fullName');


const DispatcherSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
    selectPopulatedPaths: false,
  }
);

DispatcherSchema.virtual('userObject', {
  localField: '_id',
  foreignField: 'refToRole',
  ref: 'User',
  justOne: true,
});

DispatcherSchema.virtual('fullName').get(fullName);

const Dispatcher = mongoose.model('Dispatcher', DispatcherSchema);
module.exports = Dispatcher;
