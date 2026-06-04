import { v2 as cloudinary } from "cloudinary";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Point dotenv to server/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = new pg.Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
});

const IMG_DIR = "/Users/dre/Library/CloudStorage/GoogleDrive-andersond21@mailbox.winthrop.edu/My Drive/SPRING2026/DIFD451/Sports Analysis Project/DataAnalysisTool/NBADataAnalysisTool/archive (4)/img";

async function uploadPlayerImages() {
  const files = fs.readdirSync(IMG_DIR).filter((f) => f.endsWith(".png"));

  console.log(`Found ${files.length} images to upload`);

  for (const file of files) {
    const playerId = path.basename(file, ".png");
    const filePath = path.join(IMG_DIR, file);

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: `nba_players/${playerId}`,
        overwrite: true,
      });

      const photoUrl = result.secure_url;

      await pool.query(
        `UPDATE public.players SET photo_url = $1 WHERE person_id = $2`,
        [photoUrl, playerId]
      );

      console.log(`✓ ${playerId} → ${photoUrl}`);
    } catch (err) {
      console.error(`✗ Failed for ${playerId}:`, err.message);
    }
  }

  console.log("Done!");
  await pool.end();
}

uploadPlayerImages();