const mongoose = require('mongoose');


const ZoneSchema = new mongoose.Schema(
    {
        name: String,
        color: {
            type: String,
            match: [/^#[0-9A-F]{6}$/i, 'Pls enter a valid hex code number']
        },
        zipCodes: [{ 
            type: String,
            validate: [val => val.length <= 12, 'You can only add up to 12 zip codes in a zone']
        }],
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
        selectPopulatedPaths: false,
      }
  );
  
  const Zone = mongoose.model('Zone', ZoneSchema);
  
  module.exports = Zone;
  