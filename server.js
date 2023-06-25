const express = require("express");
const { openai } = require("./openai");
const { createCanvas, loadImage } = require("canvas");
const twemoji = require("twemoji-parser");
require("dotenv").config();
const GIFEncoder = require("gifencoder");

const app = express();
const PORT = process.env.PORT || 3000;

// Generate a description based on a text prompt
async function generateEmojis(prompt) {
  const result = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `List a sequence of emojis that represents "${prompt}":`,
    max_tokens: 50,
    n: 1,
    stop: null,
    temperature: 0.7,
  });

  const description = result.data.choices[0].text.trim()
  return description;
}

// Create an animated GIF from a sequence of emojis
async function createAnimatedGif(emojis, width, height, delay) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const encoder = new GIFEncoder(width, height);

  console.log(emojis);

  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(delay);

  for (const emoji of emojis) {
    const parsedEmoji = twemoji.parse(emoji, {
      folder: "svg",
      ext: ".svg",
    });

    if (parsedEmoji.length === 0) {
      console.warn(`No image found for emoji: ${emoji}`);
      continue;
    }

    const imgSrc = parsedEmoji[0].url;
    const img = await loadImage(imgSrc);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    encoder.addFrame(ctx);
  }

  encoder.finish();

  return encoder.out.getData();
}

app.get("/generate-animated-emoji", async (req, res) => {
  const prompt = req.query.prompt || "smiling face with sunglasses";
  const numFrames = parseInt(req.query.numFrames) || 5;
  const width = parseInt(req.query.width) || 128;
  const height = parseInt(req.query.height) || 128;
  const delay = parseInt(req.query.delay) || 200;

  try {
    const emojis = await generateEmojis(prompt);
    console.log({ emojis });
    const animatedGif = await createAnimatedGif(
      emojis.slice(0, numFrames),
      width,
      height,
      delay
    );

    res.setHeader("Content-Type", "image/gif");
    res.send(animatedGif);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating animated emoji");
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
