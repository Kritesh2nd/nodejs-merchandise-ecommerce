const express = require("express");

const JwtService = require("../service/JwtService");
const secretKey = "your-very-secret-key";
const jwtExpiration = 3600000;
const jwtService = new JwtService(secretKey, jwtExpiration);

const fs = require("fs");
const router = express.Router();

const { v4: uuidv4 } = require("uuid");

const envFile = fs.existsSync(".env.local") ? ".env.local" : ".env";
require("dotenv").config({ path: envFile });

const stripe = require("stripe")(process.env.VITE_STRIPE_SK);

const CART_DATA_FILE = "./data/cart.json";
const USER_DATA_FILE = "./data/user.json";
const PRODUCT_DATA_FILE = "./data/product.json";
const ORDER_DATA_FILE = "./data/order.json";

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

// Helper fucntion to remove all user cart items
const removeUserCartItems = (user) => {
  let carts = readData(CART_DATA_FILE);
  let newCart = carts.filter((item) => item.userId != user.id);
  writeData(CART_DATA_FILE, newCart);
};

// Helper function to save user ordered product in order storage
const saveUserOrder = (user) => {
  const userCart = getUserCartProductsQuantity(user);
  const orderId = uuidv4();
  let orderItems = readData(ORDER_DATA_FILE);
  const userOrderItems = userCart.map((item) => {
    return {
      id: uuidv4(),
      userId: user.id,
      productId: item.id,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      orderId: orderId,
      date: new Date(),
      status: "pending",
    };
  });
  orderItems.push(...userOrderItems);
  writeData(ORDER_DATA_FILE, orderItems);
};

// Helper function to get user order
const getUserOrderList = (user) => {
  const orders = readData(ORDER_DATA_FILE);
  const userOrders = orders.filter((item) => item.userId == user.id);
  return userOrders;
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

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { user } = getUserAndProduct(req);
    if (user == null) {
      res.status(498).json("Invalid Authentication");
      return;
    }
    const orderProduct = req.body;
    if (orderProduct.length <= 0) {
      res.status(401).json({ message: "Order not found" });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      line_items: orderProduct,
      mode: "payment",
      success_url: `http://localhost:3000/cart/payment-success?userId=${user.id}`,
      cancel_url: "http://localhost:5173/payment/failed",
    });

    res.status(200).json({
      message: "Redirecting to payment page",
      redirectUrl: session.url,
    });
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: "server err" });
  }
});

router.get("/payment-success", (req, res) => {
  try {
    const userId = req.query.userId;
    const users = readData(USER_DATA_FILE);
    const user = users.find((u) => u.id == userId);
    const paymentSuccessUrl = "http://localhost:5173/payment/success";
    if (user == null) {
      res.status(498).json("Invalid Authentication");
      return;
    }
    saveUserOrder(user);
    removeUserCartItems(user);
    res.redirect(paymentSuccessUrl);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: "server err in payment success" });
  }
});

router.post("/user-order-record", (req, res) => {
  try {
    const { user } = getUserAndProduct(req);
    if (user == null) {
      res.status(498).json("Invalid Authentication");
      return;
    }
    res.status(200).json(getUserOrderList(user));
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: "error in getting user older order" });
  }
});

router.get("/get-pending-order", (req, res) => {
  try {
    const orders = readData(ORDER_DATA_FILE);
    const pendingOrder = orders.filter((item) => item.status == "pending");
    res.status(200).json(pendingOrder);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: "error in getting pending order" });
  }
});

router.get("/get-completed-order", (req, res) => {
  try {
    const orders = readData(ORDER_DATA_FILE);
    const completedOrder = orders.filter((item) => item.status == "completed");
    res.status(200).json(completedOrder);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: "error in getting pending order" });
  }
});

router.post("/update-pending-order/:id", (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = readData(ORDER_DATA_FILE);

    let completedOrder = orders.filter((item) => item.status == "completed");
    let pendingOrder = orders.filter(
      (item) => item.status == "pending" && item.orderId == orderId
    );
    let remainingPendingOrder = orders.filter(
      (item) => item.status == "pending" && item.orderId != orderId
    );
    let updatedPendingOrder = pendingOrder.map((item) => {
      item.status = "completed";
      return item;
    });
    const orderList = [
      ...completedOrder,
      ...updatedPendingOrder,
      ...remainingPendingOrder,
    ];

    writeData(ORDER_DATA_FILE, orderList);
    res.status(200).json({});
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: "error in getting pending order" });
  }
});

router.post("/revert-completed-order/:id", (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = readData(ORDER_DATA_FILE);

    let pendingOrder = orders.filter((item) => item.status == "pending");
    let completedOrder = orders.filter(
      (item) => item.status == "completed" && item.orderId == orderId
    );
    let remainingCompletedOrder = orders.filter(
      (item) => item.status == "completed" && item.orderId != orderId
    );
    let updatedgCompletedOrder = completedOrder.map((item) => {
      item.status = "pending";
      return item;
    });
    const orderList = [
      ...pendingOrder,
      ...updatedgCompletedOrder,
      ...remainingCompletedOrder,
    ];

    writeData(ORDER_DATA_FILE, orderList);
    res.status(200).json({});
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: "error in getting pending order" });
  }
});

module.exports = router;
