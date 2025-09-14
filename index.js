// index.js
const { TwitterApi } = require("twitter-api-v2");
const GenAI = require("@google/generative-ai");
const { execSync } = require("child_process");

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
    maxOutputTokens: 300,
    temperature: 0.7,
  },
});

// --- List of stocks ---
const stocks = [
  "360ONE",
  "3M India",
  "Abbott India",
  "ACC",
  "Adani Total Gas",
  "Aditya Birla Capital",
  "Aditya Birla Fashion & Retail",
  "AIA Engineering",
  "Ajanta Pharma",
  "Alkem Laboratories",
  "Ashok Leyland",
  "Astral",
  "Aurobindo Pharma",
  "Balkrishna Industries",
  "Bank of India",
  "Bata India",
  "Berger Paints",
  "Biocon",
  "Bharat Forge",
  "BHEL",
  "Canara Bank",
  "Clean Science & Tech",
  "Coforge",
  "Container Corporation",
  "Coromandel International",
  "Crompton Greaves Consumer",
  "Cummins India",
  "Dalmia Bharat",
  "Deepak Nitrite",
  "Delhivery",
  "Dixon Technologies",
  "Dr. Lal Path Labs",
  "Emami",
  "Escorts Kubota",
  "Federal Bank",
  "Fortis Healthcare",
  "Godrej Properties",
  "Gujarat Gas",
  "Gujarat State Petronet",
  "HPCL",
  "Hindustan Zinc",
  "Honeywell Automation",
  "ICICI Securities",
  "IDFC First Bank",
  "Indiamart Intermesh",
  "Indian Bank",
  "IEX",
  "Indian Hotels",
  "Indraprastha Gas",
  "Ipca Laboratories",
  "JSW Energy",
  "Jindal Steel & Power",
  "Jubilant Foodworks",
  "L&T Finance",
  "L&T Technology Services",
  "LIC Housing Finance",
  "Laurus Labs",
  "Linde India",
  "Lupin",
  "M&M Financial Services",
  "Max Financial Services",
  "Max Healthcare",
  "Motherson Sumi Wiring",
  "NALCO",
  "Navin Fluorine",
  "Nippon Life AMC",
  "Oberoi Realty",
  "Oil India",
  "Oracle Financial Services",
  "PB Fintech",
  "Page Industries",
  "Petronet LNG",
  "Polycab India",
  "Poonawalla Fincorp",
  "Power Finance Corp",
  "Prestige Estates",
  "Punjab National Bank",
  "REC Ltd",
  "Shriram Transport Finance",
  "Sona BLW Precision",
  "SAIL",
  "Sun TV Network",
  "Syngene International",
  "Tata Chemicals",
  "Tata Communications",
  "Tata Elxsi",
  "Ramco Cements",
  "Torrent Power",
  "Trent",
  "Trident",
  "Tube Investments",
  "Union Bank",
  "United Breweries",
  "Varun Beverages",
  "Voltas",
  "Whirlpool",
  "Zydus Lifesciences",
];

// --- Helper to get stock with persistent index ---
function getNextStock() {
  const currentIndex = parseInt(process.env.STOCK_INDEX || "0", 10);
  const stock = stocks[currentIndex % stocks.length];

  // Calculate next index (wrap around if needed)
  const nextIndex = (currentIndex + 1) % stocks.length;

  // Persist the next index back to GitHub variable
  try {
    execSync(`gh variable set STOCK_INDEX --body "${nextIndex}"`, {
      stdio: "inherit",
    });
  } catch (e) {
    console.error("⚠️ Failed to update STOCK_INDEX:", e.message);
  }

  return stock;
}

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
  try {
    // --- Stock Analysis ---
    const stock = getNextStock();
    const stockPrompt = `
    Generate a short stock analysis for ${stock}.
    Include positives, negatives, and overall investment view (+ve/-ve/Neutral).
    Strictly under 270 characters. Make it sound natural, not AI-generated.
    Add 1-2 relevant hashtags & an emoji.
    `;
    const stockTweet = await generateTweet(stockPrompt);
    await sendTweet(stockTweet);
  } catch (err) {
    console.error("❌ Error generating or sending tweet:", err);
  }
}

run();
