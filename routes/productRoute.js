import express from "express";
import { addProduct, productList, removeProduct, getProduct, updateProduct, deleteProductImage, addProductImage, searchProduct, getCloudinarySignature } from "../controllers/productController.js";
import multer from "multer"
import { verifyAdmin, verifyToken } from "../middleware/auth.js";

import cloudinary from "../config/cloudinaryConfig.js";
import uploadImage from "../middleware/multerConfig.js";


const productRouter = express.Router()

// Image Storage Engine
const storage = multer.memoryStorage()

const upload = multer({ storage: multer.memoryStorage() });

productRouter.post("/add",verifyToken, verifyAdmin, upload.array("images", 5), addProduct);
productRouter.get("/", productList);
productRouter.get("/search", searchProduct);

productRouter.post("/cloudinary-signature", getCloudinarySignature);

productRouter.delete("/remove/:id", removeProduct);
productRouter.get("/:id", getProduct);
productRouter.put("/update/:id",upload.array("images", 5), updateProduct);
productRouter.delete("/deleteImage/:id", deleteProductImage);
productRouter.post("/add-image/:id",upload.array("images", 5), addProductImage);


export default productRouter;

