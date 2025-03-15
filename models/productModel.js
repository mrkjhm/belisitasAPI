import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
    name: { type:String, required:true},
    description: { type:String, required:true},
    price: {type:Number, required:true},
    // image to images
    // change to array
    images: [{type:String, required:true}],
    category: {type:String, required:true}
}, { timestamps: true })

const productModel = mongoose.models.product || mongoose.model("product", productSchema)

export default productModel;
