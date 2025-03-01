const express = require("express");
const fs = require("fs");
const router = express.Router();

const DATA_FILE = "./data/user.json";

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

// Create a user
router.post("/login-user", (req, res) => {
    const users = readData();
    const newUser = { id: Date.now().toString(), ...req.body };
    users.push(newUser);
    writeData(users);
    res.status(201).json(newUser);
  });


// Create a user
router.post("/add-user", (req, res) => {
  const users = readData();
  const newUser = { id: Date.now().toString(), ...req.body };
  users.push(newUser);
  writeData(users);
  res.status(201).json(newUser);
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
