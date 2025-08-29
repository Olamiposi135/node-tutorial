const express = require("express");
const router = express.Router();
const { User } = require("./models.js");
const uuid = require("uuid");
const { signUserToken } = require("./functions.js");

router.post("/register", async (req, res) => {
  console.log("BODY:", req.body);
  const {
    username,
    first_name,
    last_name,
    email,
    phone_number,
    password,
    confirm_password,
  } = req.body;

  // Validation
  if (password !== confirm_password) {
    return res.status(500).send("Passwords do not match");
  }

  if (!username || !password || !first_name || !last_name) {
    return res.status(500).send("All fields are required");
  }

  if (password.length < 6) {
    return res.status(500).send("Password must be at least 6 characters");
  }

  try {
    const user_id = uuid.v4();
    console.log("Creating user...");

    // create a new user
    const user = await User.create({
      user_id,
      username,
      first_name,
      last_name,
      email,
      phone_number,
      password,
    });

    console.log("User created:", user.username);

    // setting the cookie on the registration if the user is successfully registered
    res.cookie("userID", signUserToken(user._id), {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60, // 24 hours
    });

    console.log("Cookie set, redirecting...");

    return res.redirect("/");
  } catch (error) {
    console.log("Error creating user:", error);

    res.sendStatus(500).send("Error creating user");
  }
});

router.post(
  "/login",
  function (req, res, next) {
    next();
  },
  async function (req, res) {
    const { username, password } = req.body;

    try {
      if (!username || !password) {
        return res.status(400).send("Username and password are required");
      }

      const user = await User.findOne({
        username: username,
      });

      console.log("Login attempt for:", username);

      if (!user) {
        return res.status(400).send("Invalid username ");
      }

      // Use async comparePassword method
      const isValidPassword = await user.comparePassword(password);

      if (!isValidPassword) {
        return res.status(400).send("Invalid username or password");
      }

      // Set cookie
      res.cookie("userID", signUserToken(user._id), {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60, // 24 hours
      });

      console.log("Login successful, redirecting...");
      return res.redirect("/");
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).send("Login failed");
    }
  }
);

router.all("/logout", function (req, res) {
  res.clearCookie("userID");
  req.user = false;
  res.redirect("/login");
});

router.get("/register", function (req, res) {
  return res.render("signup");
});

router.get("/login", function (req, res) {
  return res.render("login");
});

router.get("/dashboard", function (req, res) {
  return res.render("dashboard");
});

module.exports = router;
