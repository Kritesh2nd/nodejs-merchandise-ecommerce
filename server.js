const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");

// Middleware
app.use(bodyParser.json());

// Use routes
app.use("/api", userRoutes);
app.use("/api", productRoutes);

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
