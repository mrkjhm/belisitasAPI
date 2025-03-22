import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema;

const productSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    description: {
        type:String,
        required:true
    },
    price: {
        type:Number,
        required:true
    },
    images: [
        {
        public_id: {
            type: String,
            required: true
        },
        url : {
            type: String,
            required: true
        }
    }
    ],
    category: {
        type: ObjectId,
        ref: 'Category',
        required: [true, 'Product must belong to a category']
    }
}, { timestamps: true })

const productModel = mongoose.models.product || mongoose.model("product", productSchema)

export default productModel;
