import express from "express";
import mongoose from "mongoose"
import cors from "cors";


import { connectDB } from './config/db.js'
import productRouter from './routes/productRoute.js';
import userRouter from "./routes/userRoute.js";
import "dotenv/config"

// import dotenv from "dotenv";
// dotenv.config();


// app config
const app = express();
const port = 4000;

// middleware
app.use(express.json())
app.use(express.urlencoded({extended:true}));

const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://belisitas.vercel.app",
        "https://belisitas-admin.vercel.app"
        ],
    credentials: true,
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

// DB Connection
connectDB()

// api endpoints
app.use("/products", productRouter);
app.use("/images",express.static('uploads'));
app.use("/users", userRouter );


app.get("/", (req, res) => {
    res.send("API Working")
})

app.listen(port,() => {
    console.log(`Server Started on http://localhost:${port}`)
})

// mongodb+srv://markjhemamerna:spikint1991@cluster0.nfhii.mongodb.net/?
// mongodb+srv://markjhemamerna:spikint1991@cluster0.nfhii.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0