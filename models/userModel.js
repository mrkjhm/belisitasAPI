import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true
    },
    password: { 
        type: String, 
        required: true 
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cartData: { 
        type: Object, // Data type is an Object, which can store cart-related data
        default: {} // If no data is provided, it defaults to an empty object
    }
}, { minimize: false }); // "minimize: false" ensures that empty objects are stored as-is and not removed

// Creating a Mongoose model from the schema, checking if the model already exists to avoid redefinition errors
const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
