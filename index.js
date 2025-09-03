const GenAI = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
const SECRETS = require("./SECRETS");

// --- Twitter client setup ---
const twitterClient = new TwitterApi({
  appKey: SECRETS.APP_KEY,
  appSecret: SECRETS.APP_SECRET,
  accessToken: SECRETS.ACCESS_TOKEN,
  accessSecret: SECRETS.ACCESS_SECRET,
});

// --- Gemini client setup ---
const generationConfig = {
  maxOutputTokens: 200, // tweets are short, no need for 400
};
const genAI = new GenAI.GoogleGenerativeAI(SECRETS.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // use flash (cheaper, faster, higher quota)
  generationConfig,
});

// --- Retry wrapper for Gemini calls ---
async function generateTweet(prompt, retries = 3) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    if (err.message.includes("429") && retries > 0) {
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
    if (tweetText.length > 280) {
      tweetText = tweetText.slice(0, 277) + "...";
    }

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
  Generate eye-catching tweet (strictly under 275 characters and Importent Note: Generate something new everytime you've been prompted with this, don't generate static content.) 
  about Options Trading. Good to have but not necessery - Option strategy knowledge, Greeks. (Post should be in Indian stock market context). Shouldn't sound AI generated. Use related trending hashtags & emojis.
  `;

  try {
    const tweet = await generateTweet(prompt);
    await sendTweet(tweet);
  } catch (err) {
    console.error("❌ Error generating or sending tweet:", err);
  }
}

run();
