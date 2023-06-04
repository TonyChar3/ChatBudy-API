import mongoose from 'mongoose';

const notificationsItem = mongoose.Schema({
    text: {
        type: String
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