import mongoose from 'mongoose';

const browserDataElementSchema = mongoose.Schema({
    browser: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        default: 0
    }
});

const visitorDataElementSchema = mongoose.Schema({
    visitor_count: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});

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

const visitorSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    visitorData: [visitorDataElementSchema],
    browserData: [browserDataElementSchema],
    visitor: [visitorElementSchema]
},
{
    timestamps: true
});

export default mongoose.model("Visitors", visitorSchema);