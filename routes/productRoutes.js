const express = require("express");
const fs = require("fs");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

const DATA_FILE = "./data/product.json";
const uniqueId = uuidv4();

// Helper function to get specific item count from array
const filterFirstByCount = (array, count) => array.slice(0, count);

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

router.post("/add-product", (req, res) => {
  const products = readData();
  const newProduct = { id: uniqueId, ...req.body };
  products.push(newProduct);
  writeData(products);
  res.status(201).json(newProduct);
});

router.get("/products", (req, res) => {
  res.json(readData());
});

router.get("/featured-products", (req, res) => {
  let products = readData();
  let featuredProducts = products.filter((prd) => prd.featured);

  res.json(filterFirstByCount(featuredProducts, 12));
});

router.get("/category-products/:categroy", (req, res) => {
  let products = readData();
  let categoryProducts = products.filter((prd) => {
    const code = prd.code[0] + prd.code[1] + prd.code[2];
    if (code == req.params.categroy.toUpperCase()) {
      return prd;
    }
  });
  if (req.params.categroy == "all") {
    res.json(filterFirstByCount(products, 12));
  }
  res.json(filterFirstByCount(categoryProducts, 12));
});

router.get("/discounted-products", (req, res) => {
  let products = readData();
  let discountedProducts = products.filter((prd) => prd.discount > 0);
  res.json(filterFirstByCount(discountedProducts, 9));
});

router.get("/search-products/:keyword", (req, res) => {
  let products = readData();
  let searchProducts = products.filter((product) =>
    product.title.toLowerCase().includes(req.params.keyword.toLowerCase())
  );

  res.json(filterFirstByCount(searchProducts, 8));
});

router.get("/product/:id", (req, res) => {
  const products = readData();
  const product = products.find((u) => u.id == req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

router.post("/update-product/:id", (req, res) => {
  let products = readData();
  const index = products.findIndex((u) => u.id == req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });
  products[index] = { ...products[index], ...req.body };
  writeData(products);
  res.json(products[index]);
});

router.post("/delete-product/:id", (req, res) => {
  let products = readData();
  products = products.filter((u) => u.id != req.params.id);
  writeData(products);
  res.json({ message: "Product deleted successfully" });
});

module.exports = router;
