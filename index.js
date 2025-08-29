const http = require("http"); //this makes it suitable to be used for a backend system

const { functionToImport, anotherToImport } = require("./other_file.js");
const env = require("dotenv");
env.config();
const fs = require("fs");
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express(); //express is a framework that makes it easy to create a server
const path = require("path");
const ws = require("ws"); //websocket manager
const uuid = require("uuid"); //unique id system for our users
const { channel } = require("process");
const mongoose = require("mongoose");
const UserRoutes = require("./userRoutes.js");
const { User, Message, Channel } = require("./models.js");
const multer = require("multer"); //middleware for handling multipart/form-data, which is used for uploading files
const { verifyUserToken } = require("./functions.js");

const html = fs.readFileSync(path.join(__dirname, "frontend.html"));

app.set("view engine", "ejs"); //set the view engine to ejs
app.set("views", path.join(__dirname, "html")); //loap up a settings on your app

// User middleware
const setUser = async (req, res, next) => {
  const userID = verifyUserToken(req.cookies.userID);
  if (userID) {
    const user = await User.findById(userID.userID);

    if (user) {
      req.user = user;
    } else {
      req.user = false;
    }
  } else {
    req.user = false;
  }
  next();
};

app.use(cookieParser());

app.use(express.json()); //this allows us to parse json data from the request body

app.use(express.static(path.join(__dirname, "public"))); //this allows us to serve static files from the public directory

app.use(express.urlencoded()); //this allows us to parse url encoded data from the request body

app.use(setUser); //

//multer setup for file uploads
const storage = multer.diskStorage({
  destination: "./public/uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now().toString() + "_" + file.originalname);
  },
});

const uploader = multer({
  storage: storage,
});

app.post("/upload", uploader.single("fieldName"), (req, res) => {
  res.send(`
    <script>
    alert('File uploaded Successfully!!')
    window.history.back();
    </script>
    `);
});

app.get("/upload", async (req, res) => {
  res.render("upload");
});

//controller
app.all("/endpoint", function (req, res) {
  res.render("index");
});

//dynamic middleware redirecting
app.use(UserRoutes);

//test dynamic rendering of ejs rendering
app.all("/", async function (req, res) {
  const user = req.user;

  if (!user) {
    return res.redirect("/login");
  }
  const chats = await user.load_chats();
  res.render("chat", {
    title: "Second Template",
    text: "<p>Testing the Dynamism of EJS template</p>",
    nav: [
      { title: "Home", link: "/" },
      { title: "Shop", link: "/shop" },
      { title: "Profile", link: "/profile" },
      { title: "Settings", link: "/settings" },
    ],
    chats: chats,
    user: user,
  });
});

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    //everything here handles your normal http call end response
    "content-type": "text/html",
  });
  res.end(functionToImport(html));
});

const uri = process.env.LOCAL_SERVER;

if (!uri) {
  throw new Error("❌ MongoDB URI not found. Check your .env file.");
}

mongoose
  .connect(uri, {
    maxPoolSize: 50, // Maintain up to 50 socket connections
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    connectTimeoutMS: 2500, // Give up initial connection after 2.5 seconds
    retryReads: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Connection error:", err));

const channels = {
  general: {
    sockets: new Set(),
    users: new Set(),
  },
};

const wss = new ws.Server({ server });

wss.on("connection", (socket) => {
  const user_id = uuid.v4();

  socket.on("message", (message) => {
    console.log("Message received from Client is :", message.toString("utf-8"));
    try {
      //message must always be formatted in JSON format
      let text = JSON.parse(message.toString("utf-8"));

      if (text.former_user_id && text.former_user_id != text.chat_id) {
        const currentUser = User.findOne({ user_id: text.chat_id });
        const formerUser = User.findOne({ user_id: text.former_user_id });
      }

      if (text.message == "update_chat_id") {
        const allSockets = channels["general"].sockets;
        const allUsers = channels["general"].users;

        const last_id = text.last_chat_id;
        const new_id = text.chat_id;

        allUsers.delete(last_id);
        allUsers.add(new_id);

        for (const sock in allSockets) {
          if (sock.user_id == last_id) {
            sock.user_id = new_id;
          }
        }

        channels["general"].sockets = allSockets;
        channels["general"].users = allUsers;
        return;
      }

      const channel_info = channels[text.channel_id ?? "general"]; //checking if the variable if falsy

      if (text.channel_id && !channels[text.channel_id]) {
        channels[text.channel_id] = {
          sockets: new Set([{ user_id: text.sender_id, socket }]),
          users: new Set([text.sender_id]),
          creator_id: text.sender_id,
        };
        if (text.recipient_id && channel_info.users.has(text.recipient_id)) {
          for (const user of channel_info.sockets) {
            if (user.user_id == text.recipient_id) {
              channels[text.channel_id].sockets.add(user);
              channels[text.channel_id].users.add(text.recipient_id);
              text.online_users = channels[text.channel_id].sockets.size;
              user.socket.send(JSON.stringify(text));
              break;
            }
          }
        }
      } else if (channel_info) {
        const users = channel_info.sockets;
        // channel_info.sockets.add(socket);

        if (
          text.recipient_id &&
          channel_info.users.has(text.recipient_id) &&
          text.sender_id
        ) {
          for (const user of channel_info.sockets) {
            if (text.recipient_id == user.user_id) {
              text.online_users = channel_info.sockets.size;
              user.socket.send(JSON.stringify(text));
              break;
            }
          }
        } else {
          for (const user of users) {
            if (user.socket != socket) {
              text.online_users = channel_info.sockets.size;
              user.socket.send(JSON.stringify(text));
            }
          }
        }
      } else {
        channels[text.chat_id] = {};
        channels[text.chat_id].sockets = new Set();
        channels[text.chat_id].sockets.add(socket);
      }
    } catch (error) {
      console.error("error sending message", error);
      socket.send("Invalid Message format sent");
    }
  });

  const send_obj = {
    message: "set_chat_id",
    type: "set_user",
    chat_id: user_id,
  };

  channels["general"].users.add(user_id);
  const user_socket = {
    user_id,
    socket,
  };

  // User.create({
  //   user_id,
  // });

  channels["general"].sockets.add(user_socket);

  send_obj.online_users = channels["general"].sockets.size;

  socket.send(JSON.stringify(send_obj));
});

const PORT = 9000;
server.listen(PORT, () => {
  console.log(`Server started successfully on port : ${PORT}`);
});

app.listen(9001, () => {
  console.log("Express server is running on port 9001");
});
