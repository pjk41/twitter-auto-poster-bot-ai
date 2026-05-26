// index.js
import { TwitterApi } from "twitter-api-v2";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import stocks from "./stocks.js";

dotenv.config();

// --- Twitter client setup ---
const twitterClient = new TwitterApi({
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

// --- Gemini client setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const FIXED_HASHTAGS = [
  "#NIFTY50",
  "#GIFTNIFTY",
  "#SHAREMARKET",
  "#DALALSTREET",
  "#STOCKMARKET",
  "#StocksToWatch",
];

const MARKET_INDEXES = [
  { label: "NIFTY 50", source: "nse", ticker: "^NSEI", nseIndex: "NIFTY 50" },
  { label: "BANK NIFTY", source: "nse", ticker: "^NSEBANK", nseIndex: "NIFTY BANK" },
  { label: "SENSEX", source: "yahoo", ticker: "^BSESN" },
];

const NSE_ALL_INDICES_URL = "https://www.nseindia.com/api/allIndices";

const TRADING_HOLIDAYS = (process.env.MARKET_HOLIDAYS || "2025-01-26,2025-03-29,2025-08-15,2025-10-02,2025-10-22,2025-12-25,2026-01-26,2026-03-25,2026-08-15,2026-10-02,2026-11-04,2026-12-25")
  .split(",")
  .map((date) => date.trim())
  .filter(Boolean);

const BOT_MODE = process.env.MODE?.trim().toLowerCase() || "daily_thread";

function getISTDate(date = new Date()) {
  const [month, day, yearAndTime] = date
    .toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    })
    .split("/");

  const [year, time] = yearAndTime.split(", ");
  const [hour, minute, second] = time.split(":").map(Number);
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour, minute, second));
}

function getISTDateString(date = new Date()) {
  return getISTDate(date).toISOString().split("T")[0];
}

function formatISTDateTime(date = new Date()) {
  return getISTDate(date).toISOString().replace("T", " ").slice(0, 19);
}

function getISTDateOnly(date = new Date()) {
  return getISTDateString(date);
}

function isSameISTDay(dateA, dateB = new Date()) {
  return getISTDateOnly(dateA) === getISTDateOnly(dateB);
}

function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function isMarketHoliday(date) {
  return TRADING_HOLIDAYS.includes(getISTDateString(date));
}

function isTradingDay(date) {
  return !isWeekend(date) && !isMarketHoliday(date);
}

function makeISTEvent(date, hour, minute) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(Date.UTC(year, month, day, hour, minute) - istOffsetMs);
}

function getNextMarketPulseTime(reference = new Date()) {
  const now = reference.getTime();
  const todayIst = getISTDate(reference);
  const targets = [
    { hour: 9, minute: 30 },
    { hour: 11, minute: 0 },
  ];

  for (const { hour, minute } of targets) {
    const event = makeISTEvent(todayIst, hour, minute);
    if (event.getTime() > now + 1000) return event;
  }

  let nextDay = new Date(todayIst.getTime() + 24 * 60 * 60 * 1000);
  while (!isTradingDay(nextDay)) {
    nextDay = new Date(nextDay.getTime() + 24 * 60 * 60 * 1000);
  }

  return makeISTEvent(nextDay, 9, 30);
}

async function fetchNseIndexMetrics(indexName, ticker) {
  if (!indexName || !ticker) return null;

  try {
    const response = await fetch(NSE_ALL_INDICES_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const row = (data.data || []).find(
      (item) => item.index === indexName || item.indexSymbol === indexName
    );
    if (!row || typeof row.last !== "number") return null;

    const latest = row.last;
    const changePercent = parseFloat(row.percentChange) || 0;
    const changePoints = parseFloat(row.variation) || 0;

    return {
      ticker,
      latestClose: latest,
      changePercent,
      changePoints,
      latestDate: `${formatISTDateTime(new Date())} IST`,
      isCurrentDay: true,
      source: "nse",
    };
  } catch (err) {
    console.warn(`⚠️ Failed to fetch NSE metrics for ${indexName}:`, err.message || err);
    return null;
  }
}

async function fetchYahooIndexMetrics(ticker) {
  if (!ticker) return null;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const closes = result.indicators?.quote?.[0]?.close || [];
    const opens = result.indicators?.quote?.[0]?.open || [];
    const timestamps = result.timestamp || [];

    const points = closes
      .map((close, index) => ({
        close,
        open: opens[index],
        timestamp: timestamps[index],
      }))
      .filter((item) =>
        typeof item.close === "number" &&
        typeof item.open === "number" &&
        typeof item.timestamp === "number"
      )
      .map((item) => ({
        ...item,
        date: new Date(item.timestamp * 1000),
        istDate: getISTDateOnly(new Date(item.timestamp * 1000)),
      }));

    const todayIst = getISTDateOnly(new Date());
    const todaysPoints = points.filter((item) => item.istDate === todayIst);
    if (todaysPoints.length < 1) return null;

    const latest = todaysPoints[todaysPoints.length - 1];
    const previousClose = result.meta?.previousClose ?? result.meta?.chartPreviousClose ?? null;
    let changePoints;
    let changePercent;

    if (typeof previousClose === "number" && previousClose > 0) {
      changePoints = latest.close - previousClose;
      changePercent = (changePoints / previousClose) * 100;
    } else if (todaysPoints.length >= 2) {
      const previous = todaysPoints[todaysPoints.length - 2];
      changePoints = latest.close - previous.close;
      changePercent = (changePoints / previous.close) * 100;
      console.warn(
        `⚠️ Previous close unavailable for ${ticker}; falling back to prior intraday bar for delta calculation.`
      );
    } else {
      return null;
    }

    const latestAgeMinutes = Math.round((Date.now() - latest.date.getTime()) / 60000);
    if (latestAgeMinutes > 30) {
      console.warn(
        `⚠️ Latest quote for ${ticker} is ${latestAgeMinutes} minutes old. Skipping this index.`
      );
      return null;
    }

    return {
      ticker,
      latestClose: latest.close,
      changePercent,
      changePoints,
      latestDate: `${formatISTDateTime(latest.date)} IST`,
      isCurrentDay: true,
      latestAgeMinutes,
      source: "yahoo",
    };
  } catch (err) {
    console.warn(`⚠️ Failed to fetch Yahoo metrics for index ${ticker}:`, err.message || err);
    return null;
  }
}

async function fetchIndexMetrics({ source, ticker, nseIndex }) {
  if (source === "nse") {
    return fetchNseIndexMetrics(nseIndex, ticker);
  }
  return fetchYahooIndexMetrics(ticker);
}

async function runMarketPulse() {
  try {
    console.log("📈 Running Market Pulse workflow...");

    // Check if it's a trading day - if not, skip posting Market Pulse
    if (!isTradingDay(getISTDate(new Date()))) {
      console.log("🏖️ Today is a holiday or weekend. Skipping Market Pulse tweet.");
      return;
    }

    const snapshots = await Promise.all(
      MARKET_INDEXES.map(async (index) => {
        const metrics = await fetchIndexMetrics(index);
        return {
          label: index.label,
          ...(metrics || {}),
        };
      })
    );

    const allRealTime = snapshots.every(
      (snapshot) => snapshot.latestClose && snapshot.isCurrentDay
    );
    if (!allRealTime) {
      console.log(
        "⚠️ Real-time market data unavailable for one or more indices. Skipping Market Pulse tweet."
      );
      return;
    }

    const indexLines = snapshots.map((snapshot) => {
      if (!snapshot.latestClose) {
        return `${snapshot.label} data unavailable`;
      }

      const arrow = snapshot.changePercent >= 0 ? "⬆️" : "⬇️";
      const signedPercent = `${snapshot.changePercent >= 0 ? "+" : "-"}${Math.abs(snapshot.changePercent).toFixed(2)}`;
      const pointChange = typeof snapshot.changePoints === "number"
        ? Math.abs(snapshot.changePoints).toFixed(2)
        : "N/A";

      return `${snapshot.label} : ${snapshot.latestClose.toFixed(2)} ${arrow} ${signedPercent}% (${pointChange} points)`;
    });

    const indexData = indexLines.join("\n");

    const questions = [
      "Where are we heading?",
      "Closing positive or negative today?",
      "Closing GREEN or RED?",
      "Which side are you on today, CE or PE?",
      "Yahan se upar ya neeche?",
      "What's cooking?",
      "Thoughts on today's move?",
      "Today's highlight?",
      "Bulls or bears — who will win?",
      "Your thoughts on today's moves?",
      "Which index reaction stood out?",
      "What caught your attention in today's session?",
      "How are you viewing the market from here?",
      "What are you watching as markets digest this action?",
    ];
    const question = questions[Math.floor(Math.random() * questions.length)];

    const tweetBody = `Currently markets are trading -\n\n${indexData}\n\n${question}`;

    const hashtags = ["#Nifty", "#BankNifty", "#Sensex", ...FIXED_HASHTAGS];
    const uniqueHashtags = [...new Set(hashtags)];
    const shuffledHashtags = uniqueHashtags
      .map((tag) => ({ tag, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((item) => item.tag)
      .join(" ");

    const tweetText = `${tweetBody}\n\n${shuffledHashtags}`;

    console.log("🧠 Market Pulse tweet generated");
    await sendTweet(tweetText);

    console.log("✅ Market Pulse posted. No follow-up quote will be added.");

  } catch (err) {
    console.error("❌ Market Pulse workflow failed:", err);
  }
}

function scheduleMarketPulse() {
  const nextRun = getNextMarketPulseTime(new Date());
  const nextRunLocal = nextRun.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
  console.log(`⏱️ Next Market Pulse scheduled for ${nextRunLocal} IST`);

  const delayMs = nextRun.getTime() - Date.now();
  setTimeout(async () => {
    if (isTradingDay(getISTDate(new Date()))) {
      await runMarketPulse();
    } else {
      console.log("🏖️ Today is a holiday or weekend. Skipping Market Pulse tweet.");
    }
    scheduleMarketPulse();
  }, Math.max(delayMs, 0));
}


// --- Persistent index for cycling through stocks ---
let currentIndex = 0;

// --- Helper to get a random stock each time ---
function getNextStock() {
  if (!stocks || stocks.length === 0) throw new Error("Stocks array is empty");
  const index = Math.floor(Math.random() * stocks.length);
  const stock = stocks[index];
  console.log(`🎲 Randomly selected stock #${index}: ${stock}`);
  return stock;
}

async function fetchTickerFromYahoo(stockName) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(stockName)}&quotesCount=10&newsCount=0`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const quotes = data.quotes || [];
    if (!quotes.length) return null;

    const nseQuote = quotes.find((q) => {
      const symbol = q.symbol || "";
      const exchange = (q.exchange || q.exch || "").toString().toUpperCase();
      return exchange === "NSE" || symbol.endsWith(".NS") || symbol.endsWith("-NS");
    });

    return (nseQuote || quotes[0]).symbol || null;
  } catch (err) {
    console.warn("⚠️ Yahoo ticker lookup failed:", err.message || err);
    return null;
  }
}

function average(array) {
  return array.reduce((acc, value) => acc + value, 0) / array.length;
}

async function fetchStockMetrics(ticker) {
  if (!ticker) return null;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const closes = result.indicators?.quote?.[0]?.close || [];
    const timestamps = result.timestamp || [];
    const daily = closes
      .map((close, index) => ({
        close,
        date: timestamps[index] ? new Date(timestamps[index] * 1000) : null,
      }))
      .filter((item) => typeof item.close === "number" && item.date);

    if (daily.length < 50) return null;

    const latest = daily[daily.length - 1];
    const closeValues = daily.map((item) => item.close);
    const last252 = closeValues.slice(-252);
    const last50 = closeValues.slice(-50);
    const last200 = closeValues.slice(-200);

    return {
      ticker,
      latestClose: latest.close,
      latestDate: latest.date.toISOString().split("T")[0],
      week52High: Math.max(...last252),
      week52Low: Math.min(...last252),
      sma50: average(last50),
      sma200: average(last200),
    };
  } catch (err) {
    console.warn("⚠️ Yahoo stock metrics failed:", err.message || err);
    return null;
  }
}

async function fetchFundamentals(ticker) {
  if (!ticker) return null;
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail,assetProfile,financialData,defaultKeyStatistics`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];
    if (!result) return null;

    const summaryDetail = result.summaryDetail || {};
    const assetProfile = result.assetProfile || {};
    const financialData = result.financialData || {};
    const keyStats = result.defaultKeyStatistics || {};

    return {
      marketCap: summaryDetail.marketCap?.raw,
      peRatio: summaryDetail.trailingPE?.raw,
      pbRatio: summaryDetail.priceToBook?.raw,
      dividendYield: summaryDetail.dividendYield?.raw,
      sector: assetProfile.industry,
      industry: assetProfile.sector,
      businessSummary: assetProfile.longBusinessSummary,
      revenue: financialData.totalRevenue?.raw,
      profitMargin: financialData.profitMargins?.raw,
      returnOnEquity: financialData.returnOnEquity?.raw,
      debtToEquity: financialData.debtToEquity?.raw,
      beta: summaryDetail.beta?.raw,
      volume: summaryDetail.volume?.raw,
      avgVolume: summaryDetail.averageVolume?.raw,
    };
  } catch (err) {
    console.warn("⚠️ Yahoo fundamentals failed:", err.message || err);
    return null;
  }
}

function formatLatestDataForPrompt(marketData, fundamentals) {
  if (!marketData) {
    return `Latest market snapshot is not available for this stock. Use only the information provided below and do not invent or exaggerate technical claims.`;
  }

  let prompt = `Latest market snapshot for ${marketData.ticker}:
- Latest close: ₹${marketData.latestClose.toFixed(2)} (as of ${marketData.latestDate})
- 52-week high: ₹${marketData.week52High.toFixed(2)}
- 52-week low: ₹${marketData.week52Low.toFixed(2)}
- 50-day SMA: ₹${marketData.sma50.toFixed(2)}
- 200-day SMA: ₹${marketData.sma200.toFixed(2)}

`;

  if (fundamentals) {
    prompt += `Company fundamentals:
- Market Cap: ${fundamentals.marketCap ? `₹${(fundamentals.marketCap / 10000000).toFixed(0)} Cr` : 'N/A'}
- P/E Ratio: ${fundamentals.peRatio ? fundamentals.peRatio.toFixed(2) : 'N/A'}
- P/B Ratio: ${fundamentals.pbRatio ? fundamentals.pbRatio.toFixed(2) : 'N/A'}
- Dividend Yield: ${fundamentals.dividendYield ? `${(fundamentals.dividendYield * 100).toFixed(2)}%` : 'N/A'}
- Sector: ${fundamentals.sector || 'N/A'}
- Industry: ${fundamentals.industry || 'N/A'}
- Debt-to-Equity: ${fundamentals.debtToEquity ? fundamentals.debtToEquity.toFixed(2) : 'N/A'}
- Return on Equity: ${fundamentals.returnOnEquity ? `${(fundamentals.returnOnEquity * 100).toFixed(2)}%` : 'N/A'}
- Profit Margin: ${fundamentals.profitMargin ? `${(fundamentals.profitMargin * 100).toFixed(2)}%` : 'N/A'}
- Beta: ${fundamentals.beta ? fundamentals.beta.toFixed(2) : 'N/A'}

Business Summary: ${fundamentals.businessSummary || 'Not available'}

`;
  } else {
    prompt += `Company fundamentals: Not available regionally listed/micro stocks.

When fundamental data is unavailable, analyze using:
- Business Model: What's the company's niche and primary business focus?
- Competitive Moat: What unique advantages, technologies, or market positions protect the business?
- Unique Value Proposition: What makes this company different from competitors in its space?

`;
  }

  prompt += `Guidance:
- Only use these exact values in the analysis.
- Do NOT say the stock is near a 52-week high unless it is within 2% of the 52-week high.
- Do NOT say it is above the 50/200 DMA unless the latest close is above that moving average.
- Do NOT invent any additional numerical data or price relationships.
- For fundamentals section with available data: use valuation, profitability, and balance sheet metrics.
- For fundamentals section without data: focus on the company's niche, competitive moat, and unique business strengths.
- Make the first post teaser specific and compelling - highlight ONE unique aspect of the company's business or competitive advantage.
- Avoid generic statements like "benefiting from sector growth" - be specific about what makes this company interesting.
- Use business information to identify unique products, technologies, market positions, or business models.`;

  return prompt;
}

// --- Retry wrapper for Gemini calls (FIXED VERSION) ---
async function generateTweet(prompt, retries = 3, delayMs = 60000) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
      },
    });

    let text = result.response.text();

    // Safety: remove accidental markdown wrapping
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return text;
  } catch (err) {
    const isRetryable =
      err.message.includes("429") ||
      err.message.includes("quota") ||
      err.message.includes("503") ||
      err.message.includes("500") ||
      err.message.includes("502") ||
      err.message.includes("Service Unavailable") ||
      err.message.includes("temporarily unavailable");

    if (isRetryable && retries > 0) {
      const reason =
        err.message.includes("503") || err.message.includes("Service Unavailable")
          ? "Service temporarily unavailable"
          : err.message.includes("429")
            ? "Rate limited"
            : "Temporary error";

      console.log(
        `⚠️ ${reason}. Retrying in ${delayMs / 1000}s... (${retries} retries left)`
      );
      await new Promise((r) => setTimeout(r, delayMs));
      return generateTweet(prompt, retries - 1, delayMs);
    }
    throw err;
  }
}

// --- Tweet sending function with max-length enforcement ---
async function sendTweet(tweetText, replyToId = null) {
  try {
    if (!tweetText || !tweetText.trim()) {
      throw new Error("Empty tweet text");
    }

     // Explicit dry run toggle (set directly in code for testing)
    const DRY_RUN = false; // change to false when you want to send real tweets
    
    if (!twitterClient) {
      throw new Error("Twitter client not initialized");
    }
    
    if (DRY_RUN) {
      console.log("---- TWEET START ----");
      console.log(tweetText);
      console.log("---- TWEET END ----\n");
    
      console.log("🟡 [DRY RUN MODE] Tweet NOT sent to Twitter API");
      return `dry_${Math.random().toString(36).substring(2, 8)}`;
    }

    const tweetPayload = {
      text: tweetText,
    };

    if (replyToId) {
      tweetPayload.reply = {
        in_reply_to_tweet_id: replyToId,
      };
    }

    const posted = await twitterClient.v2.tweet(tweetPayload);

    console.log("🟢 Tweet sent successfully!");
    console.log("Tweet ID:", posted.data.id);

    return posted.data.id;
  } catch (error) {
    console.error("❌ Error sending tweet:", error?.response?.data || error);
    return null;
  }
}

// --- Main runner ---
async function run() {
  try {

    let replyToId = null;

    const stock = getNextStock()
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    const ticker = await fetchTickerFromYahoo(stock);
    const marketData = await fetchStockMetrics(ticker);
    const fundamentals = await fetchFundamentals(ticker);
    const marketSummary = formatLatestDataForPrompt(marketData, fundamentals);

    const threadPrompt = `
Generate a DAILY STOCK THREAD for X (Twitter).

Stock: ${stock}
Ticker: ${ticker || "unknown"}
${marketSummary}

Return output STRICTLY in this JSON format:

{
  "posts": [
    "First post text",
    "Second post text"
  ]
}

ABSOLUTE RULES (follow exactly):

- Produce exactly TWO posts inside the "posts" array.
- Do NOT include markdown formatting like ** or * anywhere.
- Do NOT include backticks.
- Do NOT include code blocks.
- Do NOT add explanations outside JSON.
- Output VALID JSON only.
- Do NOT repeat section titles.
- Do NOT merge headings with bullet points.
- Do NOT include emojis inside bullet lines.
- Keep language professional, concise and high-quality.
- Do NOT fabricate exact price or technical claims; use only the data shown above.

----------------------------------------
POST 1 (Teaser)
----------------------------------------

Structure EXACTLY like this:

Stock of the Day 🚀

STOCK NAME (plain text, no asterisks)

1–2 concise, powerful lines explaining ONE very interesting insight about the company 
(example: industry leadership, structural growth driver, competitive advantage, strong balance sheet, or emerging catalyst).

No fixed character limit; keep it concise and powerful.

----------------------------------------
POST 2 (Deep Dive)
----------------------------------------

Start EXACTLY with:

Lets dive into detailed analysis -

Then two line breaks.

Then follow this structure EXACTLY:

📊 Technical:

- Current price position relative to key levels (52-week high/low, moving averages)
- Recent price action and trend indicators
- Volume analysis if available

📈 Fundamentals:

- If valuation data available: discuss P/E, P/B ratios and pricing implications
- If profitability data available: ROE, profit margins, and business quality
- If balance sheet data available: debt-to-equity and financial health
- If data unavailable: discuss the company's niche, competitive moat, and unique business strengths that create value

✅ Positives:

- Bullet point
- Bullet point

⚠️ Risks:

- Bullet point
- Bullet point

🔮 Outlook:

Short 1–2 line forward-looking summary.

Rules for POST 2:

- Use simple hyphen bullets only.
- No emojis inside bullet lines.
- Keep total length under 900 characters.
- Do NOT repeat headings.
- Do NOT restate entire analysis inside Outlook.
- Keep tone neutral and analytical.
- No investment advice language like "buy now" or "strong buy".

Return only valid JSON.
`;

    const raw = await generateTweet(threadPrompt);
    
    // Remove accidental markdown wrapping
    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    
    let parsed;
    
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("❌ Gemini returned invalid JSON");
      console.log("RAW:", raw);
      return;
    }
    
    if (!parsed.posts || !Array.isArray(parsed.posts) || parsed.posts.length !== 2) {
      console.error("❌ Invalid posts structure");
      console.log(parsed);
      return;
    }

    const safeTrim = (text, limit = 1000) => {
      const requiredSuffix = "... Show more";
    
      if (text.length <= limit) {
        return text.replace(/\.\.\.\s*show more$/i, requiredSuffix);
      }
    
      let base = text.replace(/\.\.\.\s*show more$/i, "").trim();
      const reservedLength = requiredSuffix.length + 1;
      const maxBaseLength = limit - reservedLength;
    
      let trimmedBase = base
        .slice(0, maxBaseLength)
        .replace(/\s+\S*$/, "")
        .trim();
    
      return `${trimmedBase} ${requiredSuffix}`;
    };

    // Helpers to enforce required structure when model output is imperfect
    function makeHashtag(stockName) {
      // Use first 2-3 words or meaningful part (avoid "Limited", "Company", etc.)
      const stopwords = ['limited', 'company', 'corp', 'ltd', 'inc'];
      const parts = stockName.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
      let candidate = parts.slice(0, 2).join('');
      
      // If last word is a stopword and we have multiple words, drop it
      if (parts.length > 1 && stopwords.includes(parts[parts.length - 1].toLowerCase())) {
        candidate = parts.slice(0, -1).slice(-2).join('');
      }
      
      if (!candidate) candidate = stockName.replace(/[^A-Za-z0-9]/g, "");
      return `#${candidate.replace(/[^A-Za-z0-9]/g, "")}`;
    }

    function ensureFirstPostRules(text, stockName) {
      let t = text.replace(/\r\n/g, "\n").trim();
    
      // Remove existing "... Show more"
      t = t.replace(/\.\.\.\s*Show more$/i, "").trim();
    
      // Extract first hashtag if present
      const hashtagMatch = t.match(/#[^\n]+/);
      const stockHashtag = makeHashtag(stockName);
    
      if (hashtagMatch) {
        t = t.replace(hashtagMatch[0], "").trim();
      }
    
      const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
      const insight = lines.slice(2).join(" ");
    
      const hashtags = [stockHashtag, ...FIXED_HASHTAGS];
      const uniqueHashtags = [...new Set(hashtags)];
    
      return `Stock of the Day 🚀

${stockName}

${insight}

${uniqueHashtags.join(" ")}`;
    }

    // Only two posts expected; enforce limits and structural rules explicitly
    const finalPosts = parsed.posts.slice(0, 2).map((p, idx) => {
      const trimmed = p.replace(/\n{3,}/g, "\n\n").trim();
    
      if (idx === 0) {
        const enforced = ensureFirstPostRules(trimmed, stock);
        return enforced; // No character limit for first post (X Premium)
      }
    
      return trimmed; // DO NOT MODIFY second post
    });

    console.log(`🧵 Posting ${finalPosts.length} tweets`);

    for (const tweet of finalPosts) {
      replyToId = await sendTweet(tweet, replyToId);
      if (!replyToId) break;

      // ⏳ critical: avoid X rate limits
      await new Promise(resolve => setTimeout(resolve, 90_000)); // 90 seconds
    }

  } catch (err) {
    console.error("❌ Thread generation failed:", err);
  }
}

if (BOT_MODE === "market_pulse") {
  runMarketPulse();
} else {
  run();
}
