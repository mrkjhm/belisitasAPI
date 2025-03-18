import multer from "multer";

const storage = multer.memoryStorage(); // Store files in memory instead of disk
const upload = multer({ storage });

export default upload;
