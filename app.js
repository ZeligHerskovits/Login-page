const express = require("express");
var docs = require("express-mongoose-docs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const sharedsession = require("express-socket.io-session");
const { errorHandler } = require("./middleware/errorHandler");
const cron = require('node-cron');
const cors = require("cors");
const path = require("path");
const router = require("./routes");
const http = require("http");
const app = express();
const socketIo = require("socket.io");

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://127.0.0.1:5500", // Replace with the URL of your frontend
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});


app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true, // Allow cookies to be sent
   // allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.static('html'));
app.use(express.static('css'));

const sessionMiddleware = session({
  secret: 'your-secret-key',
  resave: true,
  saveUninitialized: false,
  cookie: { 
    //maxAge: 60000,  // Cookie expiration time in milliseconds
    secure: false,  // Set to true if using HTTPS
    httpOnly: false  // Prevents client-side JavaScript from accessing the cookie
  }
});

app.use(sessionMiddleware);

io.use(sharedsession(sessionMiddleware, {
  autoSave: true
}));

docs(app); // 2nd param is optional
app.use("/docs", express.static(path.join(__dirname, "docs")));

mongoose
  .connect("mongodb://localhost/loginPage", { useNewUrlParser: true })
  .then(() => console.log("connected to MongoDB..."))
  .catch((err) => console.err("Could not connect to mongoDB", err));

// Activity tracking middleware
function activityTracker(req, res, next) {
    req.session.lastActivity = Date.now();
    next();
}

app.use(activityTracker);

 //const TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
 const TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
 const timers = {}; // To store timers for each session
 const sessionUrls = {}; // To store URLs for each session
 function startLogoutTimer(sessionID, socket) {
    if (timers[sessionID]?.logoutTimer) clearTimeout(timers[sessionID].logoutTimer);
    if (timers[sessionID]?.finalLogoutTimer) clearTimeout(timers[sessionID].finalLogoutTimer);

    timers[sessionID] = {};

    timers[sessionID].logoutTimer = setTimeout(() => {
        // Send logout warning via WebSocket
        socket.emit('logout_warning');
    }, TIMEOUT - 60 * 1000); // Send warning 1 minute before logout

    timers[sessionID].finalLogoutTimer = setTimeout(() => {
        // Perform actual logout
        logoutUser(sessionID, socket);
    }, TIMEOUT);
}

function logoutUser(sessionID, socket) {
    console.log('User is being logged out');
    // Perform logout actions
    socket.emit('logged_out');
    socket.disconnect();
    // Clean up session timers
    if (timers[sessionID]) {
        clearTimeout(timers[sessionID].logoutTimer);
        clearTimeout(timers[sessionID].finalLogoutTimer);
        delete timers[sessionID];
    }
    delete sessionUrls[sessionID];
}

io.on('connection', (socket) => {
    console.log('A user is connected');
    const session = socket.handshake.session;
    const sessionID = session.id; // Assume each session has a unique ID


    socket.on('store_url', (url, callback) => {
        sessionUrls[sessionID] = url; // Store the current URL in sessionUrls
        if (callback) callback(); // Call the callback function to ensure URL storage is completed before redirect
    });


    if (session) {
        startLogoutTimer(sessionID, socket);

        socket.on('activity', () => {
            startLogoutTimer(sessionID, socket);
        });
        socket.on('logout_confirmation', (confirmation) => {
            if (confirmation === 'yes') {
                clearTimeout(timers[sessionID].finalLogoutTimer);
                //clearTimeout(session.finalLogoutTimer);
                startLogoutTimer(sessionID, socket);
                socket.emit('redirect');
                //socket.emit('redirect', sessionUrls[sessionID]);
            } else {
                logoutUser(sessionID, socket);
            }
        });
        socket.on('store_url2', (url) => {
            sessionUrls[sessionID] = url; // Store the current URL in sessionUrls
        });
    } else {
        console.error('Session not found for socket connection');
    }

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.use(router);
app.use("/", (req, res) => res.status(200).send("Server is running"));
app.use(errorHandler);
server.listen(3000, () => console.log(`App is running on port 3000`));