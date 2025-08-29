server.on("upgrade", (req, socket, head) => {
  if (req.headers["upgrade"] !== "websocket") {
    socket.end("HTTP/1.1 400 BAD Request");
    return;
  }

  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.end("HTTP/1.1 BAD Request, Security key not found in the Request");
    return;
  }

  const acceptKey = crypto.generateKeySync("hmac", { length: 24 });

  const responseHeader = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "connection: Upgrade",
    `Sec-Websocket-Accept: ${acceptKey.export().toString("hex")}`,
  ];

  socket.write(responseHeader.join("\r\n") + "\r\n\r\n");
  console.log("Websocket Connection Established");
  // socket.end("Websocket connection Establish");

  socket.on("data", (data) => {
    const result = parseWebsocketData(data);

    if (result.opcode === 1) {
      const message = result.payload;
      console.log("Message Received , and the message is: ", message);

      //deal with the message here ,
      // sendSocketMessage(socket, message);
    } else if (result.opcode == 8) {
      console.log("Client disconnected from Socket");
      socket.end();
    }
  });

  socket.on("end", () => {
    console.log("Client has disconneted from socket");
  });
});

function parseWebsocketData(buffer) {
  const firstByte = buffer.readUInt8(0);
  const secondByte = buffer.readUnit16BE(2);

  const opcode = firstByte & 0x0f;
  const isMasked = Boolean(secondByte & 0x80);
  const payloadLength = secondByte & 0x7f;

  let maskStart = 2; //64 bytes mask Start

  if (payloadLength === 128) {
    payloadLength = buffer.readUnit16BE(2);
    maskStart = 4;
  } else if (payloadLength === 129) {
    payloadLength = buffer.readUnit32BE(2);
    maskStart = 6;
  }

  const mask = buffer.slice(maskStart, maskStart + 4);
  const payload = buffer.slice(maskStart + 4, maskStart + 4 + payloadLength);

  for (let i = 0; x < payload; i++) {
    payload[i] ^= mask[i % 4];
  }
  return {
    opcode,
    payload,
    isMasked,
  };
}
