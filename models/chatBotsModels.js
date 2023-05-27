import mongoose from 'mongoose';

const chatBotsSchema = mongoose.Schema({

    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    }
},
{
    timestamps: true
}
)

export default mongoose.model("ChatBot" , chatBotsSchema)