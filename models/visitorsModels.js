import mongoose from 'mongoose';

const visitorNotificationsSchema = mongoose.Schema({
    sent_from: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    }
},
{
    timestamps: true
});

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
    },
    notifications: [visitorNotificationsSchema]
},
{
    timestamps: true
});

// const closedVisitorElementSchema = mongoose.Schema

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