
const { TwitterApi } = require("twitter-api-v2");
const { Configuration, OpenAIApi } = require("openai");

// --- Twitter client setup ---
const twitterClient = new TwitterApi({
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

// --- OpenAI client setup ---
const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// --- Retry wrapper for OpenAI calls ---
async function generateTweet(prompt, retries = 3) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",      // cheaper & fast, good for tweets
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7,          // adds randomness to avoid repetitive tweets
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    if (err.response?.status === 429 && retries > 0) {
      console.log("Rate limited. Retrying in 40s...");
      await new Promise(r => setTimeout(r, 40000));
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
  Generate a catchy, eye-catching post for X platform about Options Trading.
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
