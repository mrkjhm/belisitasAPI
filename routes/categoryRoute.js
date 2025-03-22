import express from "express";
import { addCategory, getCategories } from "../controllers/categoryController.js";

const categoryRouter = express.Router();

categoryRouter.post('/add', addCategory );
categoryRouter.get('/', getCategories);

export default categoryRouter;