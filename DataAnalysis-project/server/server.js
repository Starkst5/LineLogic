import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import playerRoutes from "./routes/players.routes.js";

dotenv.config();

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
});

// Use player routes
app.use("/api/players", playerRoutes(pool));

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});



const PORT = process.env.PORT || 5001;
const HOST = "0.0.0.0"; // ensures server listens on all interfaces

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});