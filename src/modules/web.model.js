import mongoose, { Schema } from "mongoose";

const webSchema = new Schema({
    name: {
        type: String,
        
    },
    description: {
        type: String,
        
    },
    logo: {
        type: String,
        
    },
    facebook: {
        type: String,
    },
    linkedin: {
        type: String,
    },
    twitter: {
        type: String,
    },
    instagram: {
        type: String,
    },
    address: {
        type: String,
        
    },
    phone: {
        type: String,
    },
    email: {
        type: String,
    },
    screenshot: {
        type: String,
    }
}, { timestamps: true })

export const Web = mongoose.model("Web", webSchema)