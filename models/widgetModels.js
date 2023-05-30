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
    position: {
        type: String
    },
    size: {
        type: String
    }

})

export default mongoose.model("Widget", widgetSchema)