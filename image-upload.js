const express = require("express");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;
const UPLOADS_DIR = "uploads"; // Directory to store images

// Middleware to serve static files
app.use(express.static(UPLOADS_DIR));

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
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ message: "Image uploaded successfully", filename: req.file.filename });
});

// API to retrieve an image
app.get("/image/:filename", (req, res) => {
  const filePath = path.join(__dirname, UPLOADS_DIR, req.params.filename);
  res.sendFile(filePath);
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
