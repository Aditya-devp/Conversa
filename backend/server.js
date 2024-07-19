const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const { chats } = require("./data/data");
const connectDB = require("./config/db");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const app = express();

connectDB();
app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/user", chatRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

const __dirname1 = path.resolve(__dirname, "..", "frontend", "build");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(__dirname1));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

app.use(notFound);
app.use(errorHandler);
const PORT = process.env.PORT;
const server = app.listen(
  PORT,
  console.log(`Server started on ${PORT}`.cyan.bold)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3001",
  },
});

io.on("connection", (socket) => {
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});
