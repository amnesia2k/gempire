import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// Needed to construct __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;
const app = express();

// Middlewares
const allowedOrigins = [
  "https://auth-api-v1-tau.vercel.app", // prod
  "http://localhost:3000", // dev
  "http://localhost:3001", // dev
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Load route files
const loadRoutes = async () => {
  const routesPath = path.join(__dirname, "routes");
  const routeFiles = fs
    .readdirSync(routesPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

  await Promise.all(
    routeFiles.map(async (file) => {
      try {
        const filePath = path.join(routesPath, file);
        const route = await import(pathToFileURL(filePath).href);

        const handler = route.default;

        // Check if handler is a function (middleware/router)
        if (typeof handler === "function") {
          app.use("/api/v1", handler);
          console.log(`✅ Loaded /api/v1 from ${file}`);
        }
        // Or if it's an Express Router object (has 'stack' array)
        else if (
          handler &&
          typeof handler === "object" &&
          Array.isArray(handler.stack)
        ) {
          app.use("/api/v1", handler);
          console.log(`✅ Loaded /api/v1 from ${file}`);
        } else {
          console.warn(
            `⚠️ Skipped loading ${file} — export default is not a middleware/router function`
          );
        }
      } catch (error) {
        console.error(`❌ Failed to load route file ${file}:`, error);
      }
    })
  );
};

// Start server after loading routes
const startServer = async () => {
  await loadRoutes();

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startServer();
