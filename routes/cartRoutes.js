const express = require("express");
const JwtService = require("../service/JwtService"); // Import the JwtService class

// Secret key and expiration time (e.g., 1 hour = 3600000 milliseconds)
const secretKey = "your-very-secret-key";
const jwtExpiration = 3600000; // 1 hour in milliseconds

// Initialize the JwtService instance
const jwtService = new JwtService(secretKey, jwtExpiration);

const fs = require("fs");
const router = express.Router();

const { v4: uuidv4 } = require("uuid");

const CART_DATA_FILE = "./data/cart.json";
const USER_DATA_FILE = "./data/user.json";
const PRODUCT_DATA_FILE = "./data/product.json";

// Generate a UUID
const uniqueId = uuidv4();

// Helper function to read data
const readData = (FILE) => {
  if (!fs.existsSync(FILE)) return [];
  const data = fs.readFileSync(FILE);
  return JSON.parse(data);
};

// Helper function to write data
const writeData = (FILE, data) => {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
};

// Validate Token
const validateToken = (token) => {
  if (!token) return false;
  try {
    const isExpired = jwtService.isTokenExpired(token);
    if (isExpired) return false;
  } catch (err) {
    return false;
  }

  const userAuth = {
    email: jwtService.extractEmail(token),
    authorities: [{ authority: "ROLE_USER" }],
  };

  const isValid = jwtService.isTokenValid(token, userAuth);
  return isValid;
};

// Helper Funciton to get user and product
const getUserAndProduct = (req) => {
  const productId = req.body.productId;
  const bearerToken = req.headers.authorization;
  const token = bearerToken.startsWith("Bearer ")
    ? bearerToken.split(" ")[1]
    : null;

  if (!validateToken(token)) {
    // res.status(498).json({ message: "Invalid or Expired Token" });
    return { user: null, product: null };
  }

  const userEmail = jwtService.extractEmail(token);
  const users = readData(USER_DATA_FILE);
  const loggedInUser = users.filter((user) => user.email == userEmail);

  if (!productId) {
    return { user: loggedInUser[0], product: {} };
  }

  const products = readData(PRODUCT_DATA_FILE);
  const selectedProduct = products.filter((product) => product.id == productId);

  if (loggedInUser.length == 0 || selectedProduct.length == 0) {
    res.status(401).json({ message: "User or Product not found" });
    return;
  }

  return { user: loggedInUser[0], product: selectedProduct[0] };
};

// Helper Function get user cart products with quantity by user
const getUserCartProductsQuantity = (user) => {
  const carts = readData(CART_DATA_FILE);
  const userCart = carts.filter((cart) => cart.userId == user.id);
  const products = readData(PRODUCT_DATA_FILE);

  const userCartProduct = userCart
    .map((cartItem) => {
      const product = products.find((p) => p.id === cartItem.productId);
      return product ? { ...product, quantity: cartItem.quantity } : null;
    })
    .filter((item) => item !== null);

  return userCartProduct;
};

// Helper Function get user cart by user
const getUserCartByUser = (user) => {
  const carts = readData(CART_DATA_FILE);
  const userCart = carts.filter((cart) => cart.userId == user.id);
  return userCart;
};

router.post("/add-to-cart", (req, res) => {
  const { user, product } = getUserAndProduct(req);

  let carts = readData(CART_DATA_FILE);
  const userCart = carts.filter((cart) => cart.userId == user.id);
  const selectedProductCart = userCart.filter(
    (cart) => cart.productId == product.id
  );

  if (selectedProductCart.length == 0) {
    const cart = {
      id: uniqueId,
      userId: user.id,
      productId: product.id,
      quantity: 1,
    };
    carts.push(cart);
    writeData(CART_DATA_FILE, carts);
  }

  if (selectedProductCart.length > 0) {
    let cart = selectedProductCart[0];
    cart = { ...cart, quantity: cart.quantity + 1 };
    const index = carts.findIndex((c) => c.id == cart.id);
    carts[index] = { ...carts[index], ...cart };
    writeData(CART_DATA_FILE, carts);
  }

  res.status(200).json({ message: "Product added to cart successfully" });
});

router.post("/get-user-cart", (req, res) => {
  const { user } = getUserAndProduct(req);
  if (user == null) {
    res.status(498).json("Invalid Authentication");
    return;
  }
  const userCartProductWithQuantity = getUserCartProductsQuantity(user);
  res.status(200).json(userCartProductWithQuantity);
});

router.post("/user-cart-increase-product", (req, res) => {
  const { user, product } = getUserAndProduct(req);
  if (user == null) {
    res.status(498).json("Invalid Authentication");
    return;
  }

  let carts = readData(CART_DATA_FILE);
  const index = carts.findIndex((c) => c.productId == product.id);
  if (index < 0) {
    res.status(401).json({ message: "Product not found" });
    return;
  }
  const quantity = carts[index].quantity + 1;
  carts[index] = {
    ...carts[index],
    quantity: quantity,
  };
  writeData(CART_DATA_FILE, carts);

  res.status(200).json({ message: "Product quantity increased successfully" });
});

router.post("/user-cart-decrease-product", (req, res) => {
  const { user, product } = getUserAndProduct(req);
  if (user == null) {
    res.status(498).json("Invalid Authentication");
    return;
  }

  let carts = readData(CART_DATA_FILE);
  const index = carts.findIndex((c) => c.productId == product.id);
  if (index < 0) {
    res.status(401).json({ message: "Product not found" });
    return;
  }
  const quantity = carts[index].quantity - 1;
  console.log("quantity", quantity);
  if (quantity == 0) {
    carts.splice(index, 1);
    writeData(CART_DATA_FILE, carts);
    res
      .status(200)
      .json({ message: "Product quantity decreased successfully" });
    return;
  }
  carts[index] = {
    ...carts[index],
    quantity: quantity,
  };

  writeData(CART_DATA_FILE, carts);
  res.status(200).json({ message: "Product quantity decreased successfully" });
});

router.post("/user-cart-remove-product", (req, res) => {
  const { user, product } = getUserAndProduct(req);
  if (user == null) {
    res.status(498).json("Invalid Authentication");
    return;
  }

  let carts = readData(CART_DATA_FILE);
  const index = carts.findIndex((c) => c.productId == product.id);
  if (index < 0) {
    res.status(401).json({ message: "Product not found" });
    return;
  }
  carts.splice(index, 1);
  writeData(CART_DATA_FILE, carts);

  res.status(200).json({ message: "Product removed from cart successfully" });
});

module.exports = router;
