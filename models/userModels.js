import mongoose from 'mongoose';

const userSchema = mongoose.Schema({

    _id: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    notifications: [{
        _id: {
            type: String
        },
        text: {
            type: String
        }
    }],
    visitors: [{
        _id: {
            type: String
        },
        email: {
            type: String
        }
    }]
},
{
    timestamps: true
}
);

export default mongoose.model("User", userSchema);