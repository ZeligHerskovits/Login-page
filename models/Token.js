const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        token: {
            type: String,
            select: false,
        },
        expired: {
            type: Boolean,
            default: false
        },
    },

    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
        selectPopulatedPaths: false,
    }
);

var Token = mongoose.model('Token', TokenSchema);
module.exports = Token;