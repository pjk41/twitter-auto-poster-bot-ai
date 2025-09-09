// index.js
const { TwitterApi } = require("twitter-api-v2");
const GenAI = require("@google/generative-ai");

// --- Twitter client setup ---
const twitterClient = new TwitterApi({
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

// --- Gemini client setup ---
const genAI = new GenAI.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // free / fast / good for short tweets
  generationConfig: {
    maxOutputTokens: 200,
    temperature: 0.7, // randomness to avoid repetitive tweets
  },
});

// --- Retry wrapper for Gemini calls ---
async function generateTweet(prompt, retries = 3) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    if (
      (err.message.includes("429") || err.message.includes("quota")) &&
      retries > 0
    ) {
      console.log("Rate limited. Retrying in 40s...");
      await new Promise((r) => setTimeout(r, 40000));
      return generateTweet(prompt, retries - 1);
    }
    throw err;
  }
}

// --- Tweet sending function ---
async function sendTweet(tweetText) {
  try {
    if (!tweetText) throw new Error("Empty tweet text");

    // Ensure max length 280 chars
    if (tweetText.length > 280) tweetText = tweetText.slice(0, 277) + "...";

    console.log("Generated Tweet:", tweetText);
    await twitterClient.v2.tweet(tweetText);
    console.log("✅ Tweet sent successfully!");
  } catch (error) {
    console.error("❌ Error sending tweet:", error);
  }
}

// --- Main runner ---
async function run() {
  const prompt = `
  Importent : Generate something new everytime.
  Give me tip of the day on Options Trading.
  Strictly under 275 characters. Shouldn't sound AI-generated.
  Use trending hashtags & emojis.
  `;

  try {
    const tweet = await generateTweet(prompt);
    await sendTweet(tweet);
  } catch (err) {
    console.error("❌ Error generating or sending tweet:", err);
  }
}

run();
