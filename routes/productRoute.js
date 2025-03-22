import express from "express";
import {
    addProduct,
    productList,
    removeProduct,
    getProduct,
    updateProduct,
    deleteProductImage,
    addProductImage,
    searchProduct,
    getCloudinarySignature
} from "../controllers/productController.js";

import { verifyAdmin, verifyToken } from "../middleware/auth.js";
import upload from "../middleware/multerConfig.js"; // Use this instead of redefining multer

const productRouter = express.Router();

// Product Routes
productRouter.post("/add", verifyToken, verifyAdmin, upload.array("images", 5), addProduct);
productRouter.get("/", productList);
productRouter.get("/search", searchProduct);

productRouter.post("/cloudinary-signature", getCloudinarySignature);

productRouter.delete("/remove/:id", verifyToken, verifyAdmin, removeProduct);
productRouter.get("/:id", getProduct);
productRouter.put("/update/:id", upload.array("images", 5), updateProduct);
productRouter.delete("/deleteImage/:id", deleteProductImage);
productRouter.post("/add-image/:id", upload.array("images", 5), addProductImage);

export default productRouter;
