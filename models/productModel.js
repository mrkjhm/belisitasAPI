import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
    name: { type:String, required:true},
    description: { type:String, required:true},
    price: {type:Number, require:true},
    // image to images
    // change to array
    images: [{type:String, require:true}],
    category: {type:String, require:true}
}, { timestamps: true })

const productModel = mongoose.models.product || mongoose.model("product", productSchema)

export default productModel;
