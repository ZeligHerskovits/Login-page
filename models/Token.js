const mongoose = require('mongoose');
var mongoose_delete = require('mongoose-delete');

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
        type: {
            type: String,
            enum: ["email","password"]
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

TokenSchema.index({ user: 1});
TokenSchema.plugin(mongoose_delete, { overrideMethods: true, deletedAt: true, deletedBy: true });

var Token = mongoose.model('Token', TokenSchema);
module.exports = Token;