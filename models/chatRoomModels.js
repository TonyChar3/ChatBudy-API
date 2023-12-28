import mongoose from "mongoose";

const conversionDataSchema = mongoose.Schema({
    conversion_count: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});
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
    },
    chat_seen: {
        type: String
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
    conversionData: [conversionDataSchema],
    chat_rooms: [chatRoomSchema]
},
{
    timestamps: true
});

export default mongoose.model("ChatRoom", chatCollectionSchema);