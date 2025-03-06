const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Enable CORS for frontend at http://localhost:5173
app.use(
  cors({
    origin: "http://localhost:5173", // Allow only this origin
    methods: "GET,POST,PUT,DELETE,OPTIONS ", // Allowed HTTP methods
    allowedHeaders: "Content-Type,Authorization", // Allowed headers
  })
);

// Import routes
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const imageRoutes = require("./routes/imageRoutes");
const cartRoutes = require("./routes/cartRoutes");

// Middleware
app.use(bodyParser.json());

// Use routes
app.use("/api", userRoutes);
app.use("/api", productRoutes);
app.use("/api", imageRoutes);
app.use("/cart", cartRoutes);

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
