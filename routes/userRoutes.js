const express = require("express");
const fs = require("fs");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

const JwtService = require("../service/JwtService");
const secretKey = "your-very-secret-key";
const jwtExpiration = 3600000;
const jwtService = new JwtService(secretKey, jwtExpiration);

const DATA_FILE = "./data/user.json";
const uniqueId = uuidv4();

// Create UserAuth
const userAuth = (email, authorities) => {
  return { email: email, authorities: authorities };
};

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

// Login user
router.post("/login-user", (req, res) => {
  const users = readData();
  const filteredUser = users.filter((user) => user.email == req.body.email);

  if (filteredUser.length == 0) {
    res.status(401).json({ message: "Email not found" });
    return;
  }

  if (filteredUser[0].password != req.body.password) {
    res.status(401).json({ message: "Email or password is incorrect" });
    return;
  }

  const userAuthorities = filteredUser[0].authorities.map((item) => {
    return { authority: item };
  });

  const userAuthData = userAuth(filteredUser[0].email, userAuthorities);

  const token = jwtService.generateToken(userAuthData);
  res.status(200).json({ token: token });
});

// Create a user
router.post("/create-user", (req, res) => {
  const users = readData();

  const sameEmailUser = users.filter((user) => user.email == req.body.email);
  if (sameEmailUser.length > 0) {
    res.status(401).json({ message: "This email is already in use." });
    return;
  }

  const newUser = { id: uniqueId, ...req.body, authorities: ["user"] };
  users.push(newUser);
  writeData(users);
  res.status(200).json({ message: "User Account Created Successfully" });
});

// Read all users
router.get("/users", (req, res) => {
  res.json(readData());
});

// Read a user by ID
router.get("/user/:id", (req, res) => {
  const users = readData();
  const user = users.find((u) => u.id == req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Update a user by ID
router.post("/update-user/:id", (req, res) => {
  let users = readData();
  const index = users.findIndex((u) => u.id == req.params.id);
  if (index === -1) return res.status(404).json({ error: "User not found" });
  users[index] = { ...users[index], ...req.body };
  writeData(users);
  res.json(users[index]);
});

// Delete a user by ID
router.post("/delete-user/:id", (req, res) => {
  let users = readData();
  users = users.filter((u) => u.id != req.params.id);
  writeData(users);
  res.json({ message: "User deleted successfully" });
});

module.exports = router;
