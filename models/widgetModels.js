import mongoose from 'mongoose';


const widgetSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    domain: {
        type: String,
        required: true
    },
    customization: {
        position: {
            type: String,
        }
    }
})

export default mongoose.model("Widget", widgetSchema)