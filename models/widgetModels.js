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
    shopify_domain: {
        type: String
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
        offline_message: {
            type: String
        },
        admin_name: {
            type: String
        },
        font_color: {
            type: String
        },
        chat_mode: {
            type: String
        }
    },
    installed: {
        type: Boolean,
        default: false
    }
})

export default mongoose.model("Widget", widgetSchema)