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
            type: String
        },
        shape: {
            type: String
        },
        main_color: {
            type: String
        },
        greeting_message: {
            type: String
        },
        admin_name: {
            type: String
        }
    }
})

export default mongoose.model("Widget", widgetSchema)