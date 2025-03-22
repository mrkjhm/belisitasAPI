import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: [true, 'Please add a category Name']
    }
}, { timestamps: true });

export default mongoose.model("Category", categorySchema);

