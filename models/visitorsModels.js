import mongoose from 'mongoose';

const visitorSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    visitor: [{
        _id: {
            type: String,
            required: true
        },
        email: {
            type: String
        },
        country: {
            type: String
        },
        browser: {
            type: String
        }
    }]
},
{
    timestamps: true
});

export default mongoose.model("Visitors", visitorSchema);