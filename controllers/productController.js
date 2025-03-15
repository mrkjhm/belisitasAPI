import productModel from "../models/productModel.js"
import cloudinary from "../config/cloudinaryConfig.js"
import fs from "fs";

// add product item
const addProduct = async (req, res) => {
    try {
        // Upload images to Cloudinary
        const uploadedImages = await Promise.all(
            req.files.map(async (file) => {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: "ecommerce_products",
                    use_filename: true,
                    transformation: [{ quality: "auto", fetch_format: "auto" }]
                });

                // Remove file from local storage after upload
                fs.unlinkSync(file.path);

                return result.secure_url; // Store Cloudinary image URL
            })
        );

        // Create new product
        const product = new productModel({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            images: uploadedImages, // Store Cloudinary URLs
        });

        await product.save();
        res.json({ success: true, message: "Product Added", data: product });

    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ success: false, message: "Server Error" });
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

// const removeProduct = async (req, res) => {
//     try {
//         const product = await productModel.findById(req.params.id);

//         if(!product) {
//             return res.json({
//                 success: false,
//                 message: "Product not found"
//             })
//         }

//         product.images.forEach((image) => {
//             fs.unlink(`uploads/${image}`, (error) => {
//                 if (error) console.log(`Failed to delete image: ${image}`, error);
//             });
//         });

//         await productModel.findByIdAndDelete(req.params.id);

//         res.json({
//             success: true,
//             message: "Product Removed"
//         })
//     } catch (error) {
//         console.log(error)
//         res.json({
//             success:false,
//             message: "Error"
//         })
//     }
// }

/*const removeProduct = async (req, res) => {
    try {
        console.log("Received request to delete product with ID:", req.params.id);

        // Find product by ID
        const product = await productModel.findById(req.params.id);

        if (!product) {
            return res.json({
                success: false,
                message: "Product not found",
            });
        }

        console.log("Found product:", product);

        // Delete associated images
        if (product.images && product.images.length > 0) {
            product.images.forEach((image) => {
                const imagePath = `uploads/${image}`;
                fs.unlink(imagePath, (error) => {
                    if (error) {
                        console.log(`Failed to delete image: ${image}`, error);
                    } else {
                        console.log(`Successfully deleted image: ${image}`);
                    }
                });
            });
        }

        // Delete product from database
        await productModel.findByIdAndDelete(req.params.id);
        console.log("Product deleted successfully!");

        res.json({
            success: true,
            message: "Product Removed",
        });
    } catch (error) {
        console.error("Error in removeProduct:", error);
        res.json({
            success: false,
            message: "Error deleting product",
        });
    }
};*/

const removeProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Delete each image from Cloudinary
        await Promise.all(
            product.images.map(async (imageUrl) => {
                const publicId = imageUrl.split("/").pop().split(".")[0]; // Extract Cloudinary public ID
                await cloudinary.uploader.destroy(`ecommerce_products/${publicId}`);
            })
        );

        await productModel.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product Removed" });

    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};



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

// const updateProduct = async (req, res) => {
//     try {
//         // Find the product by ID from request parameters
//         const product = await productModel.findById(req.params.id);
//         if (!product) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: "Product not found" 
//             });
//         }

//         console.log("Before Update - Product Data:", product);

//         // Update product details if new values are provided, otherwise keep the old values
//         product.name = req.body.name || product.name;
//         product.description = req.body.description || product.description;
//         product.price = req.body.price || product.price;
//         product.category = req.body.category || product.category;

//         // Check if there are new images uploaded
//         if (req.files && req.files.length > 0) {
//             const uploadedImages = req.files.map(file => file.filename); // Extract filenames from uploaded files
//             console.log("Uploaded Images:", uploadedImages);

//             // If replacing a specific image (req.body.imageIndex is provided)
//             if (req.body.imageIndex !== undefined) {
//                 const imageIndex = parseInt(req.body.imageIndex, 10); // Convert index to integer

//                 // Validate if the given index is within the valid range of existing images
//                 if (imageIndex >= 0 && imageIndex < product.images.length) {
//                     // Construct the old image path
//                     const oldImagePath = path.join("uploads", product.images[imageIndex]);
                    
//                     // Check if the old image exists and delete it
//                     if (fs.existsSync(oldImagePath)) {
//                         fs.unlinkSync(oldImagePath);
//                         console.log(`Deleted old image: ${oldImagePath}`);
//                     }

//                     // Replace the specific image at the given index with the new uploaded image
//                     product.images[imageIndex] = uploadedImages[0]; 
//                 } else {
//                     return res.status(400).json({ 
//                         success: false, 
//                         message: "Invalid image index" 
//                     });
//                 }
//             } else {
//                 // If no specific index is given, delete all existing images before replacing them
                
//                 product.images.forEach(image => {
//                     const oldImagePath = path.join("uploads", image);
                    
//                     // Check if the image file exists before deleting
//                     if (fs.existsSync(oldImagePath)) {
//                         fs.unlinkSync(oldImagePath);
//                     }
//                 });

//                 // Replace all images with the newly uploaded images
//                 product.images = uploadedImages;
//             }
//         }

//         // Save the updated product data to the database
//         await product.save();
//         console.log("Updated Product Data:", product);

//         // Send a success response back to the client
//         res.json({ 
//             success: true, 
//             message: "Product updated successfully", 
//             data: product 
//         });

//     } catch (error) {
//         console.error("Update Error:", error);

//         // If any error occurs, send an internal server error response
//         res.status(500).json({ 
//             success: false, 
//             message: "Error updating product" 
//         });
//     }
// };

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
            const imagesToDelete = JSON.parse(req.body.deleteImages); // Expecting an array of image names

            // Filter out the images that are being deleted
            product.images = product.images.filter(img => !imagesToDelete.includes(img));

            // Delete files from server
            imagesToDelete.forEach(image => {
                const filePath = path.join("uploads", image);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted image: ${image}`);
                }
            });
        }

        // **Handle new image uploads**
        if (req.files && req.files.length > 0) {
            const uploadedImages = req.files.map(file => file.filename); // Extract filenames

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


const deleteProductImage = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const imageIndex = parseInt(req.body.imageIndex, 10);

        if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= product.images.length) {
            return res.status(400).json({ success: false, message: "Invalid image index" });
        }

        // Delete the specified image from the file system
        const imageToDelete = product.images[imageIndex];
        const imagePath = path.join("uploads", imageToDelete);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Deleted image: ${imagePath}`);
        }

        // Remove the image from the array
        product.images.splice(imageIndex, 1);

        // Save the updated product
        await product.save();

        res.json({ success: true, message: "Image deleted successfully", data: product });

    } catch (error) {
        console.error("Image Deletion Error:", error);
        res.status(500).json({ success: false, message: "Error deleting image" });
    }
};

const addProductImage = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Check if files are uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No images uploaded" });
        }

        // Extract new images
        const uploadedImages = req.files.map(file => file.filename);
        console.log("Uploaded Images:", uploadedImages);

        // Add new images to the product's images array
        product.images.push(...uploadedImages);

        // Save updated product
        await product.save();

        res.json({ success: true, message: "Image(s) added successfully", data: product });

    } catch (error) {
        console.error("Image Addition Error:", error);
        res.status(500).json({ success: false, message: "Error adding image(s)" });
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


export { addProduct, productList, removeProduct, getProduct, updateProduct, deleteProductImage, addProductImage, searchProduct }