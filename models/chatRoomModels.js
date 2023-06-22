import mongoose from "mongoose";

const chatMessageSchema = mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    sent_by: {
        type: String,
        required: true
    },
    sender_type: {
        type: String,
        required: true
    }
},
{
    timestamps: true
});

const chatRoomSchema = mongoose.Schema({
    visitor:{
        type: String,
        required: true
    },
    messages: [chatMessageSchema]
},{
    timestamps: true
});

const chatCollectionSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    chat_rooms: [chatRoomSchema]
},
{
    timestamps: true
});

export default mongoose.model("ChatRoom", chatCollectionSchema);