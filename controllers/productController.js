import productModel from "../models/productModel.js"
import cloudinary from "../config/cloudinaryConfig.js"
import crypto from "crypto";

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

const getCloudinarySignature = async (req, res) => {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const uploadPreset = "ml_default"; // Make sure this matches your frontend preset

        // Correctly formatted string to sign
        const stringToSign = `timestamp=${timestamp}&upload_preset=${uploadPreset}${process.env.CLOUDINARY_API_SECRET}`;

        const signature = crypto
            .createHash("sha256")
            .update(stringToSign)
            .digest("hex");

        res.json({ timestamp, signature, uploadPreset }); // Include upload preset in response
    } catch (error) {
        console.error("Error generating signature:", error);
        res.status(500).json({ success: false, message: "Error generating signature" });
    }
};


const addProduct = async (req, res) => {
    try {
        const { name, description, price, category } = req.body;

        if (!name || !description || !price || !category) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (!req.body.images || req.body.images.length === 0) {
            return res.status(400).json({ success: false, message: "No images uploaded" });
        }

// Use the image URLs sent from frontend
        const uploadedImages = req.body.images;


        // ✅ Save Product in DB
        const product = new productModel({
            name,
            description,
            price: parseFloat(price),
            category,
            images: uploadedImages, // Store Cloudinary image URLs
        });

        await product.save();

        return res.status(201).json({ success: true, message: "Product added successfully", data: product });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


// all Product list
const productList = async (req, res) => {
    try {
        const products = await productModel.find({});
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

// remove product and images
const removeProduct = async (req, res) => {
    try {
        // Find the product by ID in the database
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Check if the product has images before attempting to delete them
        if (product.images && product.images.length > 0) {
            await Promise.all(
                product.images.map(async (imageUrl) => {
                    /**
                     * Extract the public ID from the Cloudinary image URL.
                     * Cloudinary image URLs are structured like this:
                     *
                     * https://res.cloudinary.com/your-cloud-name/image/upload/v1700000000/ecommerce_products/sample-image.jpg
                     *
                     * We need to extract only "sample-image" (without extension) to properly delete the image.
                     *
                     * Steps:
                     * - `imageUrl.split('/')` → Splits the URL by '/' and gets an array of parts.
                     * - `.pop()` → Gets the last part of the URL, e.g., "sample-image.jpg".
                     * - `.split('.')[0]` → Splits the filename by '.' and takes the first part ("sample-image").
                     */
                    const publicId = imageUrl.split('/').pop().split('.')[0];

                    /**
                     * Call Cloudinary's `destroy` method to remove the image.
                     * Important: Include the folder name to ensure correct deletion.
                     */
                    await cloudinary.uploader.destroy(`ecommerce_products/${publicId}`);
                })
            );
        }

        // Delete the product from the database after images are removed
        await productModel.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Product and its images have been removed"
        });

    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

// get specific product
const getProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id)

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

// update file
const updateProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        console.log("Before Update - Product Data:", product);

        // Update product details if new values are provided
        product.name = req.body.name || product.name;
        product.description = req.body.description || product.description;
        product.price = req.body.price || product.price;
        product.category = req.body.category || product.category;

        // **Delete specific images if requested**
        if (req.body.deleteImages) {
            const imagesToDelete = JSON.parse(req.body.deleteImages); // Expecting an array of image URLs

            // Remove from Cloudinary
            await Promise.all(
                imagesToDelete.map(async (imageUrl) => {
                    const publicId = cloudinary.utils.public_id(imageUrl);
                    await cloudinary.uploader.destroy(publicId);
                })
            );

            // Filter out the images that are being deleted
            product.images = product.images.filter(img => !imagesToDelete.includes(img));
        }

        // **Handle new image uploads**
        if (req.files && req.files.length > 0) {
            const uploadedImages = await Promise.all(
                req.files.map((file) => {
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
                                    console.error("Cloudinary Upload Error:", error);
                                    reject(new Error("Error uploading image to Cloudinary"));
                                } else {
                                    resolve(result.secure_url);
                                }
                            }
                        );
                        uploadStream.end(file.buffer);
                    });
                })
            );


            // Append new images instead of replacing old ones
            product.images.push(...uploadedImages);
        }

        // Save the updated product
        await product.save();
        console.log("Updated Product Data:", product);

        res.json({
            success: true,
            message: "Product updated successfully",
            data: product
        });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating product"
        });
    }
};

// Delete product image
const deleteProductImage = async (req, res) => {
    try {
        // Step 1: Find the product by ID from the database
        const product = await productModel.findById(req.params.id);

        // If product is not found, return a 404 error
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Step 2: Get the image URL from the request body
        const { imageUrl } = req.body;

        // If no image URL is provided, return a 400 error
        if (!imageUrl) {
            return res.status(400).json({ success: false, message: "Image URL is required" });
        }

        // Step 3: Check if the image exists in the product's images array
        const imageIndex = product.images.indexOf(imageUrl);

        // If the image is not found in the product's images array, return a 404 error
        if (imageIndex === -1) {
            return res.status(404).json({ success: false, message: "Image not found in product" });
        }

        // Step 4: Extract the Cloudinary public ID from the image URL
        // Cloudinary stores images with a unique public ID that we need to delete the image
        // The public ID is extracted from the URL by taking the filename without its extension
        const publicId = imageUrl.split('/').pop().split('.')[0];

        // Step 5: Delete the image from Cloudinary using the public ID
        await cloudinary.uploader.destroy(`ecommerce_products/${publicId}`);

        // Step 6: Remove the image from the product's images array
        product.images.splice(imageIndex, 1);

        // Step 7: Save the updated product data to the database
        await product.save();

        // Step 8: Send a success response back to the client
        res.json({ success: true, message: "Image deleted successfully", data: product });

    } catch (error) {
        // If any error occurs during execution, catch and log it
        console.error("Image Deletion Error:", error);

        // Return a 500 error response indicating a server-side issue
        res.status(500).json({ success: false, message: "Error deleting image" });
    }
};


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
                            folder: "ecommerce_products",
                            use_filename: true,
                            resource_type: "image",
                            transformation: [{ quality: "auto", fetch_format: "auto" }]
                        },
                        (error, result) => {
                            if (error) {
                                console.error("Cloudinary Upload Error:", error);
                                reject(new Error("Error uploading image to Cloudinary"));
                            } else {
                                resolve(result.secure_url);
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
        console.error("Image Addition Error:", error);

        // Catch unhandled errors and prevent the backend from crashing
        return res.status(500).json({ success: false, message: "Error adding image(s)" });
    }
};



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