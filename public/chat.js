const socket = new WebSocket("ws://localhost:9000");
sendMessage.onclick = function () {
  const text = message.value;

  if (text) {
    //sent the message

    //socket.send({message:text, sender:"", reciever:"", channel:""});
    const messageCont = document.createElement("div");
    messageCont.classList.add("message");
    messageCont.classList.add("sent");
    messageCont.innerText = `${text}`;
    messageBox.appendChild(messageCont);
    message.value = "";
    const chat_id = username.getAttribute("chat_id");
    const user_id = username.getAttribute("user_id");
    const recipient_id = messageBox.getAttribute("recipient_id");
    const messageObj = {
      chat_id,
      user_id,
      recipient_id: "general",
      message: text,
    };
    socket.send(JSON.stringify(messageObj));
  }
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`data gotten from server = ${data}`);
  const lastMessage = JSON.parse(localStorage.allMessage ?? "{}");

  const current_user_id = username.getAttribute("chat_id");

  if (data.message == "set_chat_id" && data.chat_id != current_user_id) {
    data.message = "update_chat_id";
    data.last_chat_id = data.chat_id;
    data.chat_id = current_user_id;

    socket.send(JSON.stringify(data));
    return;
  }

  if (!lastMessage[data.recipient_id]) {
    lastMessage[data.recipient_id] = [];
  }

  lastMessage[data.recipient_id].push(data);

  localStorage.allMessage = JSON.stringify(lastMessage);

  const senderTag = document.createElement("div");
  senderTag.classList.add("sender");
  senderTag.textContent = data.user_id; // show sender ID

  const messageContent = document.createElement("div");

  messageContent.textContent = `${data.message}`;

  const newMessage = document.createElement("div");
  newMessage.classList.add("message");
  newMessage.classList.add("received");

  newMessage.append(senderTag);
  newMessage.append(messageContent);

  messageBox.append(newMessage);
};
