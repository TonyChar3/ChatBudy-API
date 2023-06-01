import mongoose from 'mongoose';

const visitorElementSchema = mongoose.Schema({
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
},
{
    timestamps: true
});

const visitorSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    visitor: [visitorElementSchema]
},
{
    timestamps: true
});

export default mongoose.model("Visitors", visitorSchema);