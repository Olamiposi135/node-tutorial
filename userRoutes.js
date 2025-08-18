const express = require("express");
const router = express.Router();
const { User } = require("./models.js");
const uuid = require("uuid");

router.post("/register", async (req, res) => {
  const { username, first_name, last_name, email, password, confirm_password } =
    req.body;

  if (password != confirm_password) {
    return res.status(400).send("Passwords do not match");
  }

  try {
    const user_id = uuid.v4();
    await User.create({
      user_id,
      username,
      first_name,
      last_name,
      email,
      password,
    });
    // res.send("User created successfully");
    res.redirect("/dashboard");
  } catch (error) {
    console.log("Error creating user:", error);
    res.send("Error creating user");
  }
});

router.post(
  "/login",
  function (req, res, next) {
    next();
  },
  async function (req, res) {
    const { username, password } = req.body;

    const user = await User.findOne({
      username: username,
    });

    if (!user) {
      return res.send("User not found");
    }

    const compare = user.comparePassword(password);

    if (!compare) {
      return res.send("Invalid password");
    }

    return res.redirect("/dashboard");
  }
);

router.get("/register", function (req, res) {
  res.render("signup");
});

router.get("/login", function (req, res) {
  res.render("login");
});

router.get("/dashboard", function (req, res) {
  res.render("dashboard");
});

module.exports = router;
