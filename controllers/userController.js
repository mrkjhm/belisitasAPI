import bcrypt from "bcrypt";
import validator from "validator"
import userModel from "../models/userModel.js ";
import {createAccessToken } from '../middleware/auth.js'

// login user
const loginUser = async (req, res) => {

    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({
                success: false,
                message: "User doesn't found"
            })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.json({
                success: false,
                message: "Invalid credentials"
            })
        } 

        const token = createAccessToken(user);
        res.json({
            message: "User logged in successfully",
            accessToken: token
        })

    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: "Error"
        })
    }
}

// Register user
const registerUser = async (req, res) => {
    const { name, password, email } = req.body;

    try {
        // Check if user already exists
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        // Validate email
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email",
            });
        }

        // Validate password
        if (!validator.isStrongPassword(password, { minLength: 8 })) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 chars with uppercase, lowercase, number & symbol.",
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: "User registered successfully",
        });

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({
            success: false,
            message: "Server error, please try again later",
        });
    }
};

const forgotPassword = async (req, res) => {
    try {


    } catch (error) {

    }
}

// Check user email
const checkEmailExist = async (req, res) => {

    const { email } = req.body

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.json ({
            success: false,
            message: "Email doesn't exist"
        })
    }

    res.json({
        success: true,
        message: "Email exists"
    })

}


// get user profile
const getProfile = async (req, res) => {

    try {
        const user = await userModel.findById(req.user.id)

        if(!user) {
            return res.json({
                success: false,
                message: "User not found"
            })
        }

        user.password = "";
        res.json({
            success: true,
            message: user
        })

    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: "Error"
        })
    }
}

export { loginUser, registerUser, getProfile, checkEmailExist, forgotPassword }