import categoryModel from '../models/categoryModel.js';
import { errorHandler} from "../middleware/auth.js";

const addCategory = async (req, res) => {
    try {
        const { name } = req.body;

        // Check for an existing category (case-insensitive)
        const existingCategory = await categoryModel.findOne({
            name: { $regex: `^${name}$`, $options: "i" }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category already exists",
            });
        }

        // Create and save new category
        const category = new categoryModel({ name });
        const savedCategory = await category.save();

        return res.status(200).json({
            success: true,
            message: "Category added",
            result: savedCategory,
        });

    } catch (error) {
        errorHandler(error, req, res);
    }
};



const getCategories = async (req, res) => {

    try {
        const category = await categoryModel.find()
        res.json({
            success: true,
            data: category
        })
    } catch (error) {
        errorHandler(error, req, res);
    }
}

export { addCategory, getCategories };