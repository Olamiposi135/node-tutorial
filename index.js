const http = require("http"); //this makes it suitable to be used for a backend system

const { functionToImport, anotherToImport } = require("./other_file.js");
const env = require("dotenv");
env.config();
const fs = require("fs");
const express = require("express");
const app = express(); //express is a framework that makes it easy to create a server
const path = require("path");
const ws = require("ws"); //websocket manager
const uuid = require("uuid"); //unique id system for our users
const { channel } = require("process");
const mongoose = require("mongoose");
const UserRoutes = require("./userRoutes.js");
const { User, Message, Channel } = require("./models.js");
const multer = require("multer"); //middleware for handling multipart/form-data, which is used for uploading files

const html = fs.readFileSync(path.join(__dirname, "frontend.html"));

app.set("view engine", "ejs"); //set the view engine to ejs
app.set("views", path.join(__dirname, "html")); //loap up a settings

app.use(express.json()); //this allows us to parse json data from the request body

app.use(express.static(path.join(__dirname, "public"))); //this allows us to serve static files from the public directory

app.use(express.urlencoded({ extended: true })); //this allows us to parse url encoded data from the request body

//multer setup for file uploads
const storage = multer.diskStorage({
  destination: "./public/uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + file.filename);
  },
});

const uploader = multer({
  storage: storage,
});

app.post("/upload", uploader.single("fieldName"));

//controller
app.all("/endpoint", function (req, res) {
  res.render("index");
});

//dynamic middleware redirecting
app.use(UserRoutes);

//test dynamic rendering of ejs rendering
app.all("/second/endies", function (req, res) {
  res.render("index", {
    title: "Second Template",
    text: "This is the second template rendered dynamically.",
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
    console.log("Message received from Client is :", message);
    try {
      //message must always be formatted in JSON format
      let text = JSON.parse(message.toString("utf-8"));

      if (text.former_user_id && text.former_user_id != text.chat_id) {
        const currentUser = User.findOne({ user_id: text.chat_id });
        const formerUser = User.findOne({ user_id: text.former_user_id });
      }

      const channel_info = channels[text.channel_id ?? "general"];

      if (text.channel_id && !channels[text.channel_id]) {
        channels[text.channel_id] = {
          sockets: new Set([{ user_id: text.sender_id, socket }]),
          users: new Set([text.sender_id]),
          creator_id: text.sender_id,
        };
        if (text.recipent_id && channel_info.users.has(text.recipent_id)) {
          for (const user of channel_info.sockets) {
            if (user.user_id === text.recipent_id) {
              channels[text.chat_id].sockets.add(user);
              channels[text.channel_id].users.add(text.recipent_id);
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
          text.recipent_id &&
          channel_info.has(text.recipent_id) &&
          text.sender_id
        ) {
          for (const user of channel_info.sockets) {
            if (text.recipent_id == user.user_id) {
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
    message: user_id,
    type: "set_user",
  };

  channels["general"].users.add(user_id);
  const user_socket = {
    user_id,
    socket,
  };

  User.create({
    user_id,
  });

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
