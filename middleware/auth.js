import jwt from "jsonwebtoken";
import "dotenv/config";

// Create an Access Token
const createAccessToken = (user) => {
    const data = {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin
    };

    return jwt.sign(data, process.env.JWT_SECRET_KEY);
};

// Token verification middleware
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided."
        });
    }

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();

    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};

const verifyAdmin = (req, res, next) => {

    console.log("Result from verifyAdmin");
    console.log(req.user);

    if(!req.user) {
        return res.status(403).json({
            success: false,
            message: "Access denied. No user data found"
        })
    }

    if(!req.user.isAdmin) {
        return res.status(403).json({
            auth: "false",
            message: "Access denied. Admins only."
        })
    }

    next();
    
    
}

export { createAccessToken, verifyToken, verifyAdmin };
