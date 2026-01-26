// index.js
import { TwitterApi } from "twitter-api-v2";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { execSync } from "child_process";
import dotenv from "dotenv";

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

// --- List of stocks ---
const stocks = [
  "360 ONE WAM ",
  "3M India ",
  "ABB India ",
  "ACC ",
  "ACME Solar Holdings ",
  "AIA Engineering ",
  "APL Apollo Tubes ",
  "AU Small Finance Bank ",
  "AWL Agri Business ",
  "Aadhar Housing Finance ",
  "Aarti Industries ",
  "Aavas Financiers ",
  "Abbott India ",
  "Action Construction Equipment ",
  "Adani Energy Solutions ",
  "Adani Enterprises ",
  "Adani Green Energy ",
  "Adani Ports and Special Economic Zone ",
  "Adani Power ",
  "Adani Total Gas ",
  "Aditya Birla Capital ",
  "Aditya Birla Fashion and Retail ",
  "Aditya Birla Lifestyle Brands ",
  "Aditya Birla Real Estate ",
  "Aditya Birla Sun Life AMC ",
  "Aegis Logistics ",
  "Aegis Vopak Terminals ",
  "Afcons Infrastructure ",
  "Affle 3i ",
  "Ajanta Pharmaceuticals ",
  "Akums Drugs and Pharmaceuticals ",
  "Akzo Nobel India ",
  "Alembic Pharmaceuticals ",
  "Alkem Laboratories ",
  "Alkyl Amines Chemicals ",
  "Alok Industries ",
  "Amara Raja Energy & Mobility ",
  "Amber Enterprises India ",
  "Ambuja Cements ",
  "Anand Rathi Wealth ",
  "Anant Raj ",
  "Angel One ",
  "Apar Industries ",
  "Apollo Hospitals Enterprise ",
  "Apollo Tyres ",
  "Aptus Value Housing Finance India ",
  "Asahi India Glass ",
  "Ashok Leyland ",
  "Asian Paints ",
  "Aster DM Healthcare ",
  "AstraZenca Pharma India ",
  "Astral ",
  "Ather Energy ",
  "Atul ",
  "Aurobindo Pharma ",
  "Authum Investment & Infrastructure ",
  "Avenue Supermarts ",
  "Axis Bank ",
  "BASF India ",
  "BEML ",
  "BLS International Services ",
  "BSE ",
  "Bajaj Auto ",
  "Bajaj Finance ",
  "Bajaj Finserv ",
  "Bajaj Holdings & Investment ",
  "Bajaj Housing Finance ",
  "Balkrishna Industries ",
  "Balrampur Chini Mills ",
  "Bandhan Bank ",
  "Bank of Baroda",
  "Bank of India",
  "Bank of Maharashtra",
  "Bata India ",
  "Bayer Cropscience ",
  "Berger Paints India ",
  "Bharat Dynamics ",
  "Bharat Electronics ",
  "Bharat Forge ",
  "Bharat Heavy Electricals ",
  "Bharat Petroleum Corporation ",
  "Bharti Airtel ",
  "Bharti Hexacom ",
  "Bikaji Foods International ",
  "Biocon ",
  "Birlasoft ",
  "Blue Dart Express ",
  "Blue Jet Healthcare ",
  "Blue Star ",
  "Bombay Burmah Trading Corporation ",
  "Bosch ",
  "Brainbees Solutions ",
  "Brigade Enterprises ",
  "Britannia Industries ",
  "C.E. Info Systems ",
  "CCL Products (I) ",
  "CESC ",
  "CG Power and Industrial Solutions ",
  "CRISIL ",
  "Campus Activewear ",
  "Can Fin Homes ",
  "Canara Bank",
  "Caplin Point Laboratories ",
  "Capri Global Capital ",
  "Carborundum Universal ",
  "Castrol India ",
  "Ceat ",
  "Central Bank of India",
  "Central Depository Services (India) ",
  "Century Plyboards (India) ",
  "Cera Sanitaryware Ltd",
  "Chalet Hotels ",
  "Chambal Fertilizers & Chemicals ",
  "Chennai Petroleum Corporation ",
  "Choice International ",
  "Cholamandalam Financial Holdings ",
  "Cholamandalam Investment and Finance Company ",
  "Cipla ",
  "City Union Bank ",
  "Clean Science and Technology ",
  "Coal India ",
  "Cochin Shipyard ",
  "Coforge ",
  "Cohance Lifesciences ",
  "Colgate Palmolive (India) ",
  "Computer Age Management Services ",
  "Concord Biotech ",
  "Container Corporation of India ",
  "Coromandel International ",
  "Craftsman Automation ",
  "CreditAccess Grameen ",
  "Crompton Greaves Consumer Electricals ",
  "Cummins India ",
  "Cyient ",
  "DCM Shriram ",
  "DLF ",
  "DOMS Industries ",
  "Dabur India ",
  "Dalmia Bharat ",
  "Data Patterns (India) ",
  "Deepak Fertilisers & Petrochemicals Corp. ",
  "Deepak Nitrite ",
  "Delhivery ",
  "Devyani International ",
  "Divi's Laboratories ",
  "Dixon Technologies (India) ",
  "Dr. Agarwal's Health Care ",
  "Dr. Lal Path Labs ",
  "Dr. Reddy's Laboratories ",
  "Dummy SKF India ",
  "Dummy Tata Motors ",
  "Dummy Valor Estate ",
  "E.I.D. Parry (India) ",
  "EIH ",
  "Eicher Motors ",
  "Elecon Engineering Co. ",
  "Elgi Equipments ",
  "Emami ",
  "Emcure Pharmaceuticals ",
  "Endurance Technologies ",
  "Engineers India ",
  "Eris Lifesciences ",
  "Escorts Kubota ",
  "Eternal ",
  "Exide Industries ",
  "FSN E-Commerce Ventures ",
  "Federal Bank ",
  "Fertilisers and Chemicals Travancore ",
  "Finolex Cables ",
  "Finolex Industries ",
  "Firstsource Solutions ",
  "Five-Star Business Finance ",
  "Force Motors ",
  "Fortis Healthcare ",
  "GAIL (India) ",
  "GE Vernova T&D India ",
  "GMR Airports ",
  "Garden Reach Shipbuilders & Engineers ",
  "General Insurance Corporation of India",
  "Gillette India ",
  "Gland Pharma ",
  "Glaxosmithkline Pharmaceuticals ",
  "Glenmark Pharmaceuticals ",
  "Global Health ",
  "Go Digit General Insurance ",
  "Godawari Power & Ispat ",
  "Godfrey Phillips India ",
  "Godrej Agrovet ",
  "Godrej Consumer Products ",
  "Godrej Industries ",
  "Godrej Properties ",
  "Granules India ",
  "Graphite India ",
  "Grasim Industries ",
  "Gravita India ",
  "Great Eastern Shipping Co. ",
  "Gujarat Fluorochemicals ",
  "Gujarat Gas ",
  "Gujarat Mineral Development Corporation ",
  "Gujarat State Petronet ",
  "H.E.G. ",
  "HBL Engineering ",
  "HCL Technologies ",
  "HDFC Asset Management Company ",
  "HDFC Bank ",
  "HDFC Life Insurance Company ",
  "HFCL ",
  "Happiest Minds Technologies ",
  "Havells India ",
  "Hero MotoCorp ",
  "Hexaware Technologies ",
  "Himadri Speciality Chemical ",
  "Hindalco Industries ",
  "Hindustan Aeronautics ",
  "Hindustan Copper ",
  "Hindustan Petroleum Corporation ",
  "Hindustan Unilever ",
  "Hindustan Zinc ",
  "Hitachi Energy India ",
  "Home First Finance Company India ",
  "Honasa Consumer ",
  "Honeywell Automation India ",
  "Housing & Urban Development Corporation ",
  "Hyundai Motor India ",
  "ICICI Bank ",
  "ICICI Lombard General Insurance Company ",
  "ICICI Prudential Life Insurance Company ",
  "IDBI Bank ",
  "IDFC First Bank ",
  "IFCI ",
  "IIFL Finance ",
  "INOX India ",
  "IRB Infrastructure Developers ",
  "IRCON International ",
  "ITC Hotels ",
  "ITC ",
  "ITI ",
  "Indegene ",
  "India Cements ",
  "Indiamart Intermesh ",
  "Indian Bank",
  "Indian Energy Exchange ",
  "Indian Hotels Co. ",
  "Indian Oil Corporation ",
  "Indian Overseas Bank",
  "Indian Railway Catering And Tourism Corporation ",
  "Indian Railway Finance Corporation ",
  "Indian Renewable Energy Development Agency ",
  "Indraprastha Gas ",
  "Indus Towers ",
  "IndusInd Bank ",
  "Info Edge (India) ",
  "Infosys ",
  "Inox Wind ",
  "Intellect Design Arena ",
  "InterGlobe Aviation ",
  "International Gemmological Institute (India) ",
  "Inventurus Knowledge Solutions ",
  "Ipca Laboratories ",
  "J.B. Chemicals & Pharmaceuticals ",
  "J.K. Cement ",
  "JBM Auto ",
  "JK Tyre & Industries ",
  "JM Financial ",
  "JSW Energy ",
  "JSW Infrastructure ",
  "JSW Steel ",
  "Jaiprakash Power Ventures ",
  "Jammu & Kashmir Bank ",
  "Jindal Saw ",
  "Jindal Stainless ",
  "Jindal Steel ",
  "Jio Financial Services ",
  "Jubilant Foodworks ",
  "Jubilant Ingrevia ",
  "Jubilant Pharmova ",
  "Jupiter Wagons ",
  "Jyothy Labs ",
  "Jyoti CNC Automation ",
  "K.P.R. Mill ",
  "KEI Industries ",
  "KPIT Technologies ",
  "KSB ",
  "Kajaria Ceramics ",
  "Kalpataru Projects International ",
  "Kalyan Jewellers India ",
  "Karur Vysya Bank ",
  "Kaynes Technology India ",
  "Kec International ",
  "Kfin Technologies ",
  "Kirloskar Brothers ",
  "Kirloskar Oil Eng ",
  "Kotak Mahindra Bank ",
  "Krishna Institute of Medical Sciences ",
  "L&T Finance ",
  "L&T Technology Services ",
  "LIC Housing Finance ",
  "LT Foods ",
  "LTIMindtree ",
  "Larsen & Toubro ",
  "Latent View Analytics ",
  "Laurus Labs ",
  "Leela Palaces Hotels & Resorts ",
  "Lemon Tree Hotels ",
  "Life Insurance Corporation of India",
  "Linde India ",
  "Lloyds Metals And Energy ",
  "Lodha Developers ",
  "Lupin ",
  "MMTC ",
  "MRF ",
  "Mahanagar Gas ",
  "Maharashtra Scooters ",
  "Maharashtra Seamless ",
  "Mahindra & Mahindra Financial Services ",
  "Mahindra & Mahindra ",
  "Manappuram Finance ",
  "Mangalore Refinery & Petrochemicals ",
  "Mankind Pharma ",
  "Marico ",
  "Maruti Suzuki India ",
  "Max Financial Services ",
  "Max Healthcare Institute ",
  "Mazagoan Dock Shipbuilders ",
  "Metropolis Healthcare ",
  "Minda Corporation ",
  "Motherson Sumi Wiring India ",
  "Motilal Oswal Financial Services ",
  "MphasiS ",
  "Multi Commodity Exchange of India ",
  "Muthoot Finance ",
  "NATCO Pharma ",
  "NBCC (India) ",
  "NCC ",
  "NHPC ",
  "NLC India ",
  "NMDC ",
  "NMDC Steel ",
  "NTPC Green Energy ",
  "NTPC ",
  "Narayana Hrudayalaya ",
  "National Aluminium Co. ",
  "Nava ",
  "Navin Fluorine International ",
  "Nestle India ",
  "Netweb Technologies India ",
  "Neuland Laboratories ",
  "Newgen Software Technologies ",
  "Nippon Life India Asset Management ",
  "Niva Bupa Health Insurance Company ",
  "Nuvama Wealth Management ",
  "Nuvoco Vistas Corporation ",
  "Oberoi Realty ",
  "Oil & Natural Gas Corporation ",
  "Oil India ",
  "Ola Electric Mobility ",
  "Olectra Greentech ",
  "One 97 Communications ",
  "Onesource Specialty Pharma ",
  "Oracle Financial Services Software ",
  "PB Fintech ",
  "PCBL Chemical ",
  "PG Electroplast ",
  "PI Industries ",
  "PNB Housing Finance ",
  "PTC Industries ",
  "PVR INOX ",
  "Page Industries ",
  "Patanjali Foods ",
  "Persistent Systems ",
  "Petronet LNG ",
  "Pfizer ",
  "Phoenix Mills ",
  "Pidilite Industries ",
  "Piramal Pharma ",
  "Poly Medicure ",
  "Polycab India ",
  "Poonawalla Fincorp ",
  "Power Finance Corporation ",
  "Power Grid Corporation of India ",
  "Praj Industries ",
  "Premier Energies ",
  "Prestige Estates Projects ",
  "Procter & Gamble Hygiene & Health Care ",
  "Punjab National Bank",
  "R R Kabel ",
  "RBL Bank ",
  "REC ",
  "RHI MAGNESITA INDIA LTD.",
  "RITES ",
  "Radico Khaitan Ltd",
  "Rail Vikas Nigam ",
  "Railtel Corporation Of India ",
  "Rainbow Childrens Medicare ",
  "Ramkrishna Forgings ",
  "Rashtriya Chemicals & Fertilizers ",
  "Redington ",
  "Reliance Industries ",
  "Reliance Infrastructure ",
  "Reliance Power ",
  "SBFC Finance ",
  "SBI Cards and Payment Services ",
  "SBI Life Insurance Company ",
  "SJVN ",
  "SKF India ",
  "SRF ",
  "Sagility ",
  "Sai Life Sciences ",
  "Sammaan Capital ",
  "Samvardhana Motherson International ",
  "Sapphire Foods India ",
  "Sarda Energy and Minerals ",
  "Saregama India Ltd",
  "Schaeffler India ",
  "Schneider Electric Infrastructure ",
  "Shipping Corporation of India ",
  "Shree Cement ",
  "Shriram Finance ",
  "Shyam Metalics and Energy ",
  "Siemens Energy India ",
  "Siemens ",
  "Signatureglobal (India) ",
  "Sobha ",
  "Solar Industries India ",
  "Sona BLW Precision Forgings ",
  "Sonata Software ",
  "Star Health and Allied Insurance Company ",
  "State Bank of India",
  "Steel Authority of India ",
  "Sumitomo Chemical India ",
  "Sun Pharmaceutical Industries ",
  "Sun TV Network ",
  "Sundaram Finance ",
  "Sundram Fasteners ",
  "Supreme Industries ",
  "Suzlon Energy ",
  "Swan Corp ",
  "Swiggy ",
  "Syngene International ",
  "Syrma SGS Technology ",
  "TBO Tek ",
  "TVS Motor Company ",
  "Tata Chemicals ",
  "Tata Communications ",
  "Tata Consultancy Services ",
  "Tata Consumer Products ",
  "Tata Elxsi ",
  "Tata Investment Corporation ",
  "Tata Motors ",
  "Tata Power Co. ",
  "Tata Steel ",
  "Tata Technologies ",
  "Tata Teleservices (Maharashtra) ",
  "Tech Mahindra ",
  "Techno Electric & Engineering Company ",
  "Tejas Networks ",
  "The New India Assurance Company ",
  "The Ramco Cements ",
  "Thermax ",
  "Timken India ",
  "Titagarh Rail Systems ",
  "Titan Company ",
  "Torrent Pharmaceuticals ",
  "Torrent Power ",
  "Transformers And Rectifiers (India) ",
  "Trent ",
  "Trident ",
  "Triveni Engineering & Industries ",
  "Triveni Turbine ",
  "Tube Investments of India ",
  "UCO Bank",
  "UNO Minda ",
  "UPL ",
  "UTI Asset Management Company ",
  "UltraTech Cement ",
  "Union Bank of India",
  "United Breweries ",
  "United Spirits ",
  "Usha Martin ",
  "V-Guard Industries ",
  "Valor Estate ",
  "Vardhman Textiles ",
  "Varun Beverages ",
  "Vedant Fashions ",
  "Vedanta ",
  "Ventive Hospitality ",
  "Vijaya Diagnostic Centre ",
  "Vishal Mega Mart ",
  "Vodafone Idea ",
  "Voltas ",
  "Waaree Energies ",
  "Welspun Corp ",
  "Welspun Living ",
  "Whirlpool of India ",
  "Wipro ",
  "Wockhardt ",
  "Yes Bank ",
  "ZF Commercial Vehicle Control Systems India ",
  "Zee Entertainment Enterprises ",
  "Zen Technologies ",
  "Zensar Technolgies ",
  "Zydus Lifesciences ",
  "eClerx Services "
];

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

async function fetchMarketData(stockName) {
  try {
    // Map common Indian stock names to Yahoo symbols
    const symbol = stockName
      .replace(/&/g, "")
      .replace(/\s+/g, "")
      .toUpperCase();

    const yahooSymbol = `${symbol}.NS`;

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbol}`;
    const res = await fetch(url);

    const json = await res.json();
    const quote = json?.quoteResponse?.result?.[0];

    if (!quote) throw new Error("No quote data");

    return {
      cmp: Math.round(quote.regularMarketPrice),
      high52: Math.round(quote.fiftyTwoWeekHigh),
      low52: Math.round(quote.fiftyTwoWeekLow)
    };
  } catch (err) {
    console.error("❌ Yahoo fetch failed:", err.message);
    return null;
  }
}

// --- Retry wrapper for Gemini calls ---
async function generateTweet(prompt, retries = 3, delayMs = 40000) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    if ((err.message.includes("429") || err.message.includes("quota")) && retries > 0) {
      console.log(`Rate limited. Retrying in ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
      return generateTweet(prompt, retries - 1, delayMs);
    }
    throw err;
  }
}

// --- Helper: split Gemini response into tweet-sized posts ---
function splitIntoPosts(text) {
  if (!text) return [];

  return text
    .split(/\n(?=Post\s*\d+:)/i)
    .map(p => p.replace(/^Post\s*\d+:\s*/i, "").trim())
    .filter(Boolean);
}

function splitByWords(text, maxLen = 270) {
  const words = text.split(" ");
  const chunks = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).length > maxLen) {
      chunks.push(current.trim());
      current = word;
    } else {
      current += " " + word;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// --- Tweet sending function with max-length enforcement ---
async function sendTweet(tweetText, replyToId = null) {
  try {
    if (!tweetText) throw new Error("Empty tweet text");

    // Ensure max length 280 chars
    // if (tweetText.length > 280) tweetText = tweetText.slice(0, 277) + "...";

    console.log("Generated Tweet:", tweetText);

    const tweetData = replyToId
      ? { reply: { in_reply_to_tweet_id: replyToId } }
      : {};

    const posted = await twitterClient.v2.tweet(tweetText, tweetData);
    console.log("✅ Tweet sent successfully!!");
    return posted.data.id; // return tweet ID for threading
  } catch (error) {
    console.error("❌ Error sending tweet:", error);
    return null;
  }
}

// --- Main runner ---
async function run() {
  try {
    const stock = getNextStock();
    const marketData = await fetchMarketData(stock.replace(/[^A-Z]/g, ""));
    
    if (!marketData || !marketData.cmp) {
      console.error("❌ Market data unavailable, skipping tweet");
      return;
    }
    
    const { cmp, high52, low52 } = marketData;

    const threadPrompt = `
Generate a DAILY STOCK THREAD for X (Twitter).

Stock: ${stock}

Return output STRICTLY in valid JSON.
No markdown. No explanations. Only JSON.

JSON format:
{
  "posts": [
    "Post text here",
    "Post text here",
    "Post text here"
  ]
}

Rules:
- Each post must be UNDER 270 characters.
- Split content logically by MEANING.
- Write like a human investor.
- Max 1 emoji per post.

STRUCTURE:

Post 1 (Hook):
Stock of the Day 🚀
!! ${stock} !!
Catchy intro about industry, products, or a unique angle.

Post 2 (MANDATORY ORDER):
Start EXACTLY like this:
CMP: ₹${cmp} | 52W High: ₹${high52} | 52W Low: ₹${low52}

Then immediately:
Green Flags:
• key strengths
Red Flags:
• key risks

Post 3+ (if needed):
- Business & revenue model
- Recent developments
- High-level numbers (growth, margins, ROCE – no exact figures)
Outlook:
Write ONE clear, investor-style sentence such as:
- "Can be added gradually on dips"
- "Worth keeping on watchlist at current levels"
- "Suitable only for aggressive investors"
- "Better to wait for clearer growth visibility"

Constraints:
- Do NOT mention debt
- Do NOT give buy/sell advice
- No disclaimers
- Final post must include exactly ONE hashtag
`;

    const rawThread = await generateTweet(threadPrompt);

    let parsed;
    try {
      parsed = JSON.parse(rawThread.trim());
    } catch (err) {
      console.error("❌ Invalid JSON from Gemini");
      console.log(rawThread);
      return;
    }

    if (!parsed.posts || !Array.isArray(parsed.posts) || parsed.posts.length === 0) {
      console.error("❌ Gemini returned empty posts array");
      console.log(parsed);
      return;
    }

    // Word-level safety split (final guardrail)
    const posts = [];
    
    parsed.posts.forEach((p, idx) => {
      if (idx === parsed.posts.length - 1) {
        // Last post = NEVER split
        posts.push(p);
      } else {
        posts.push(...splitByWords(p, 270));
      }
    });


    console.log(`🧵 Posting ${posts.length} tweets`);

    let previousTweetId = null;
    for (const post of posts) {
      previousTweetId = await sendTweet(post, previousTweetId);
      if (!previousTweetId) break;
    }

  } catch (err) {
    console.error("❌ Thread generation failed:", err);
  }
}

run();
