import mongoose from "mongoose";
import productModel from "../models/productModel.js"
import cloudinary from "../config/cloudinaryConfig.js"
import categoryModel from "../models/categoryModel.js"
import crypto from "crypto";
import {errorHandler} from "../middleware/auth.js";

const signCloud = async (req, res) => {
    try {
        const { timestamp } = req.query;
        if (!timestamp) return res.status(400).json({ success: false, message: "Missing timestamp" });

        const signature = crypto
            .createHmac("sha256", process.env.CLOUDINARY_API_SECRET)
            .update(`timestamp=${timestamp}`)
            .digest("hex");


        console.log("Generated Signature:", signature);

        return res.json({
            signature,
            timestamp,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME
        });
    } catch (error) {
        console.error("Cloudinary Signature Error:", error);
        return res.status(500).json({ success: false, message: "Error generating signature" });
    }
};

// add product item
const cloudinaryUpload = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "ecommerce_products",
                use_filename: true,
                resource_type: "image",
                transformation: [{ quality: "auto", fetch_format: "auto" }]
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        );
        uploadStream.end(fileBuffer);
    });
};

// ✅ GET CLOUDINARY SIGNATURE  --------------------------
const getCloudinarySignature = async (req, res) => {

    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const uploadPreset = "ml_default"; // Ensure this matches your frontend

        // Correct Cloudinary signature format
        const stringToSign = `timestamp=${timestamp}&upload_preset=${uploadPreset}`;

        // Use API secret as the key for hashing
        const signature = crypto
            .createHmac("sha256", process.env.CLOUDINARY_API_SECRET) // 🔥 Use HMAC instead of append
            .update(stringToSign)
            .digest("hex");

        res.json({ timestamp, signature, uploadPreset });

    } catch (error) {
        errorHandler(error, req, res);
    }
};


// ✅ ADD PRODUCT  --------------------------
const addProduct = async (req, res) => {
    try {
        const { name, description, price, category } = req.body;

        // ✅ Check required fields
        if (!name || !description || !price || !category) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // ✅ Validate price
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            return res.status(400).json({ success: false, message: "Invalid price" });
        }

        // ✅ Check category
        const categoryDoc = await categoryModel.findOne({
            name: { $regex: new RegExp(`^${category}$`, "i") }
        });

        if (!categoryDoc) {
            return res.status(400).json({ success: false, message: "Category does not exist" });
        }

        // ✅ Validate image upload
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No images uploaded" });
        }

        if (req.files.length > 5) {
            return res.status(400).json({ success: false, message: "You can upload a maximum of 5 images." });
        }

        // ✅ Upload images to Cloudinary
        const uploadedImages = await Promise.all(
            req.files.map((file) =>
                new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: "products" },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve({ public_id: result.public_id, url: result.secure_url });
                        }
                    );
                    uploadStream.end(file.buffer);
                })
            )
        );

        // ✅ Save product in the database
        let product = new productModel({
            name,
            description,
            price: parsedPrice,
            category: categoryDoc,
            images: uploadedImages,
        });

        await product.save();

        product = await productModel.findById(product._id).populate("category", "_id, name");


        return res.status(201).json({
            success: true,
            message: "Product added successfully",
            data: product
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};


// ✅ GET PRODUCT LIST --------------------------
const productList = async (req, res) => {
    try {
        const products = await productModel.find({}).populate("category", "_id, name");
        res.json({
            success: true,
            data: products
        })
    } catch (error) {
        res.json({
            success:false,
            message: "Error"
        })
    }
}


// ✅ REMOVE PRODUCT --------------------------
const removeProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // ✅ Loop through all images and delete them from Cloudinary
        for (const img of product.images) {
            if (img.public_id) {
                await cloudinary.uploader.destroy(img.public_id);
            }
        }

        // ✅ Remove product from database
        await productModel.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Product removed successfully",
        });

    } catch (error) {
        errorHandler(error, req, res);
    }
};


// ✅ GET SPECIFIC PRODUCT --------------------------
const getProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id).populate("category", "_id, name");
        if(!product) {
            return res.json({
                success: false,
                message: "Product not found"
            })
        }
        res.json({
            success: true,
            data: product
        })
    } catch (error) {
        res.json({
            success: false,
            message: "Error"
        })
    }
}

// ✅ UPDATE PRODUCT DETAILS --------------------------
const updateProduct = async (req, res) => {

    const { name, description, price, category } = req.body;

    try {
        const product = await productModel.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            })
        }

        const categoryDoc = await categoryModel.findOne({
            name: { $regex: new RegExp(`^${category}$`, "i") }
        });

        if (!categoryDoc) {
            return res.status(400).json({
                success: false,
                message: "Category does not exist" });
        }

        const updatedProduct = await productModel.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                price,
                category: categoryDoc
            },
            { new: true, runValidators: true
            }).populate("category", "_id, name");


        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: updatedProduct
        })
    } catch (error) {
        errorHandler(error, req, res);
    }
};


// ✅ DELETE SPECIFIC IMAGE --------------------------
const deleteProductImage = async (req, res) => {
    try {
        const { public_id } = req.body; // Extract public_id from request body
        const { id } = req.params; // Extract product ID from request params

        // ✅ Validate that public_id is provided
        if (!public_id) {
            return res.status(400).json({
                success: false,
                message: "❌ Image public_id is required"
            });
        }

        // ✅ Validate if id is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "❌ Invalid Product ID" });
        }

        // ✅ Find product by ID
        const product = await productModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "❌ Product not found" });
        }

        console.log("🗑 Public ID to delete:", public_id);

        // ✅ Find the image in the product's images array by public_id
        const imageToDelete = product.images.find((img) => img.public_id === public_id);

        if (!imageToDelete) {
            return res.status(404).json({ success: false, message: "❌ Image not found in product" });
        }

        // ✅ Delete image from Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.destroy(public_id);
        console.log("🗑 Cloudinary Delete Response:", cloudinaryResponse);

        if (!["ok", "not found", "deleted"].includes(cloudinaryResponse.result)) {
            return res.status(500).json({
                success: false,
                message: "❌ Failed to delete image from Cloudinary",
                cloudinaryResponse,
            });
        }

        // ✅ Remove the deleted image from the product's images array
        product.images = product.images.filter((img) => img.public_id !== public_id);
        await product.save();

        res.json({
            success: true,
            message: "✅ Image deleted successfully",
            data: product
        });

    } catch (error) {
        console.error("❌ Image Deletion Error:", error);
        res.status(500).json({ success: false, message: "❌ Error deleting image" });
    }
};


// ✅ ADD IMAGE IN SPECIFIC IMAGE --------------------------
const addProductImage = async (req, res) => {
    try {
        // Step 1: Find the product by ID
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Step 2: Ensure the product has less than 5 images BEFORE UPLOADING
        if (product.images.length >= 5) {
            return res.status(400).json({
                success: false,
                message: "Cannot add more than 5 images to a product"
            });
        }

        // Step 3: Check if images are uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No images uploaded"
            });
        }

        // Step 4: Ensure the total number of images doesn't exceed 5
        if (product.images.length + req.files.length > 5) {
            return res.status(400).json({
                success: false,
                message: `You can only upload ${5 - product.images.length} more image(s).`
            });
        }

        // Step 5: Process and upload images to Cloudinary
        const uploadedImages = await Promise.all(
            req.files.map((file) => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: "products",
                            resource_type: "image",
                            transformation: [{ quality: "auto", fetch_format: "auto" }]
                        },
                        (error, result) => {
                            if (error) {
                                console.error("❌ Cloudinary Upload Error:", error);
                                reject(new Error("Error uploading image to Cloudinary"));
                            } else {
                                resolve({
                                    public_id: result.public_id, // ✅ Store public_id
                                    url: result.secure_url // ✅ Store URL
                                });
                            }
                        }
                    );
                    uploadStream.end(file.buffer);
                });
            })
        );

        // Step 6: Add images and save the product
        product.images.push(...uploadedImages);
        await product.save();

        // Step 7: Send success response
        return res.json({
            success: true,
            message: "Image(s) added successfully",
            data: product
        });

    } catch (error) {
        errorHandler(error, req, res);
    }
};

// ✅ SEARCH PRODUCT --------------------------
const searchProduct = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({ success: false, message: "Search term is required" });
        }

        // Convert search term to a string (important fix!)
        const searchString = String(search);

        const filter = {
            name: { $regex: searchString, $options: "i" } // Case-insensitive search
        };

        const products = await productModel.find(filter);

        res.json({ success: true, data: products });
    } catch (error) {
        console.error("Error searching products:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


export { addProduct, productList, removeProduct, getProduct, updateProduct, deleteProductImage, addProductImage, searchProduct, signCloud, getCloudinarySignature, cloudinaryUpload }