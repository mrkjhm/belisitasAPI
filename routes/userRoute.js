import express from "express";
import { checkEmailExist, getProfile, loginUser, registerUser, forgotPassword } from "../controllers/userController.js";
import { verifyToken } from "../middleware/auth.js";

const userRouter = express.Router()

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/details", verifyToken, getProfile);
userRouter.post("/check-email",verifyToken, checkEmailExist);
userRouter.post("/forgot-password",verifyToken, forgotPassword);



export default userRouter;