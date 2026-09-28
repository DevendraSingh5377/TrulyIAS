const dotenv = require("dotenv");
dotenv.config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

console.log("CLIENT URL:", process.env.CLIENT_URL);

connectDB();

const app = express();

// Dynamically handle allowed origins, strip trailing slashes, and handle preflight requests
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://trulyias-1.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, "")); // Strip trailing slashes automatically

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server redirects)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: Origin ${origin} not allowed by CORS policy.`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// 1. Apply CORS middleware globally
app.use(cors(corsOptions));

// 2. Explicitly handle Preflight OPTIONS requests for all routes
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ message: "TrulyIAS API is running" });
});

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`TrulyIAS server running on port ${PORT}`);
});