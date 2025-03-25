const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, "../images/uploads/");
const OLD_IMG_DIR = path.join(__dirname, "../images/oldImages/");
const DATA_FILE = "./data/product.json";

const uniqueId = uuidv4();

// Ensure the upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // Save files in the uploads directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename file with timestamp
  },
});

// File Filter: Accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extName = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only images (jpg, jpeg, png, gif) are allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter });

// Upload Image Endpoint
router.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }
  res.json({
    message: "Image uploaded successfully",
    filename: req.file.filename,
  });
});

// Get Image by Filename
router.get("/images/:filename", (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Image not found" });
  }

  res.sendFile(filePath);
});

// Get Image by Filename
router.get("/old-images/:filename", (req, res) => {
  const filePath = path.join(OLD_IMG_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Image not found" });
  }

  res.sendFile(filePath);
});

// Read & Write Functions for Products
const readData = () => {
  if (!fs.existsSync(DATA_FILE)) return [];
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Upload Image and Product Data
router.post("/add-product-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  if (!req.body.productData) {
    return res.status(400).json({ error: "Product data is required" });
  }

  let productData;
  try {
    productData = JSON.parse(req.body.productData);
  } catch (error) {
    return res
      .status(400)
      .json({ error: "Invalid JSON format in productData" });
  }

  const requiredFields = [
    "code",
    "type",
    "title",
    "description",
    "game",
    "genre",
    "featured",
    "rating",
    "price",
    "quantity",
    "discount",
    "soldAmount",
  ];

  for (const field of requiredFields) {
    if (!(field in productData)) {
      return res
        .status(400)
        .json({ error: `Missing required field: ${field}` });
    }
  }

  const products = readData();
  const newProduct = {
    id: uniqueId,
    imageUrl: `http://localhost:3000/api/images/${req.file.filename}`, // Store image path
    ...productData,
  };

  products.push(newProduct);
  writeData(products);

  res.status(201).json(newProduct);
});

module.exports = router;
