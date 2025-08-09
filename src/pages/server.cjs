const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const DOWNLOAD_DIR = path.resolve(__dirname, "downloads");

// Ensure the downloads folder exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

app.post("/api/download", async (req, res) => {
  const { url, format } = req.body;

  if (!url || !format) {
    return res.status(400).json({ error: "YouTube URL and format are required" });
  }

  const videoId = new URL(url).searchParams.get("v");
  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  const outputFileName = `${videoId}.${format}`;
  const outputPath = path.join(DOWNLOAD_DIR, outputFileName);

  const command =
    format === "mp3"
      ? `yt-dlp -x --audio-format mp3 -o "${outputPath}" "${url}"`
      : `yt-dlp -f 'bestvideo+bestaudio' --merge-output-format mp4 -o "${outputPath}" "${url}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr}`);
      return res.status(500).json({ error: "Failed to download video" });
    }

    console.log(`Downloaded: ${stdout}`);
    res.download(outputPath, outputFileName, (err) => {
      if (err) {
        console.error(`Error sending file: ${err}`);
      }
      // Clean up the file after download
      fs.unlinkSync(outputPath);
    });
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});