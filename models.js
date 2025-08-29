const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Schema, model } = mongoose;

const User = new Schema({
  user_id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  first_name: {
    type: String,
  },
  last_name: {
    type: String,
  },
  username: {
    type: String,
    required: true,
    unique: true,

    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone_number: {
    type: String,

    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  timestamp: Date,
});

const Message = new Schema({
  message_id: { type: String, required: true, unique: true },
  message: {
    type: String,
    default: "",
  },
  sender: { type: Schema.Types.ObjectId, ref: "User" },
  reciever: { type: Schema.Types.ObjectId, ref: "User" },

  timestamp: {
    type: Date,
    default: Date.now,
  },
  channel: { type: Schema.Types.ObjectId, ref: "Channel" },
});

const Channels = new Schema({
  channel_id: {
    type: String,
    required: true,
    unique: true,
  },
  users: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  channel_name: String,
  channel_description: String,
  channel_icon: String,
});

User.methods.get_id = function () {
  return this.user_id; //usage of this method to get user_id.. const user = User(id=id), const user_id = user.get_id();
};

User.methods.load_chats = async function () {
  const id = this._id;
  const message = model("Message", Message);
  const messages = await message.find().populate("sender").exec();

  const user_messages = messages.filter((message) => {
    const user = message.sender;
    return user._id === id;
  });

  return user_messages;
};

User.methods.comparePassword = function (password) {
  return bcrypt.compareSync(password, this.password); //usage of this method to compare password.. user.comparePassword(password);
};

User.pre("save", function () {
  this.password = bcrypt.hashSync(this.password, 10);
});

User.statics.find_user_by_id = function (id) {
  return this.findOne({ user_id: id }); //usage of this method to find user by id.. User.find_user_by_id(id=id);
};

User.pre("deleteOne", function () {
  const id = this.get_id();
  const channel = model("Channel", Channels);
  const allChannel = channel.find();

  allChannel.forEach(() => (channel) => {
    const channel_user = channel.populate("users");
    channel_user.forEach((user, index) => {
      if (user._id == id) {
        delete channel_user[index];
      }
    });
  });
});

const exportation = {
  User: model("User", User),
  Message: model("Message", Message),
  Channel: model("Channel", Channels),
};

module.exports = exportation;
