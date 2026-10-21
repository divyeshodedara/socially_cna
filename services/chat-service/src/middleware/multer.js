import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images allowed!"), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
  fileFilter,
});

export default upload;
