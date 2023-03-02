const mongoose = require('mongoose');

const CustomerAddressSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    location: {
      formattedAddress: {
        type: String,
        required: [true, 'formattedAddress is required']
        // required: function () {
        //   // bug in mongoose this is not set to model when udpating, so we can't validate on update
        //   if (this === global) return false;
        //   return !this.location.street || !this.location.city || !this.location.state || !this.location.zipCode;
        //},
      },
      street: {
        type: String,
        required: [true, 'street is required']
      },
      city: {
        type: String,
        required: [true, 'city is required']
      },
      state: {
        type: String,
        required: [true, 'state is required']
      },
      zipCode: {
        type: String,
        required: [true, 'zipCode is required']
        // required: function () {
        //   // bug in mongoose this is not set to model when udpating, so we can't validate on update
        //   if (this === global) return false;
        //   return !this.location.formattedAddress;
        //},
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
    selectPopulatedPaths: false,
  }
);

module.exports = mongoose.model('CustomerAddress', CustomerAddressSchema);
