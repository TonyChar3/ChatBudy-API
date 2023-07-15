import mongoose from 'mongoose';

const notificationsItem = mongoose.Schema({
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

const userSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    user_access: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    notification:{
        type: [notificationsItem],
        default: []
    } 
},
{
    timestamps: true
}
);

export default mongoose.model("User", userSchema);