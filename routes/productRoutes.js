const express = require("express");
const multer = require("multer");
const path = require("path");
const app = express();
const UPLOADS_DIR = "../images/uploads/"; // Directory to store images
const fs = require("fs");
const router = express.Router();

const DATA_FILE = "./data/product.json";

// Helper function to read data
const readData = () => {
  if (!fs.existsSync(DATA_FILE)) return [];
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
};

// Helper function to write data
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Create a product
router.post("/add-product", (req, res) => {
  const products = readData();
  const newProduct = { id: Date.now().toString(), ...req.body };
  products.push(newProduct);
  writeData(products);
  res.status(201).json(newProduct);
});

// Read all products
router.get("/products", (req, res) => {
  res.json(readData());
});

// Read a product by ID
router.get("/product/:id", (req, res) => {
  const products = readData();
  const product = products.find((p) => p.id == req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// Update a product by ID
router.post("/update-product/:id", (req, res) => {
  let products = readData();
  const index = products.findIndex((p) => p.id == req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });
  products[index] = { ...products[index], ...req.body };
  writeData(products);
  res.json(products[index]);
});

// Delete a product by ID
router.post("/delete-product/:id", (req, res) => {
  let products = readData();
  products = products.filter((p) => p.id != req.params.id);
  writeData(products);
  res.json({ message: "Product deleted successfully" });
});


// Middleware to serve static files
router.use(express.static(UPLOADS_DIR));

// Storage configuration
const storage = multer.diskStorage({
  
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // Save files in "uploads" folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename file with timestamp
  },
});

const upload = multer({ storage: storage });

// API to upload an image
router.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  console.log(req.file.filename)
  res.json({ message: "Image uploaded successfully", filename: req.file.filename });
});

// API to retrieve an image
router.get("/image/:filename", (req, res) => {
  const filePath = path.join(__dirname, UPLOADS_DIR, req.params.filename);
  res.sendFile(filePath);
});

module.exports = router;
