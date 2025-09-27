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
  "ACME Solar Holdings",
  "Aadhar Housing Finance",
  "Aarti Industries",
  "Aavas Financiers",
  "Action Construction Equipment",
  "Aditya Birla Real Estate",
  "Aditya Birla Sun Life AMC",
  "Aegis Logistics",
  "Afcons Infrastructure",
  "Affle 3i",
  "Akums Drugs and Pharmaceuticals",
  "Alembic Pharmaceuticals",
  "Alivus Life Sciences",
  "Alkyl Amines Chemicals",
  "Alok Industries",
  "Amara Raja Energy & Mobility",
  "Amber Enterprises India",
  "Anand Rathi Wealth",
  "Anant Raj",
  "Angel One",
  "Aptus Value Housing Finance India",
  "Asahi India Glass",
  "Aster DM Healthcare",
  "AstraZenca Pharma India",
  "Atul",
  "Authum Investment & Infrastructure",
  "BASF India",
  "BEML",
  "BLS International Services",
  "Balrampur Chini Mills",
  "Bayer Cropscience",
  "Bikaji Foods International",
  "Birlasoft",
  "Blue Dart Express",
  "Bombay Burmah Trading Corporation",
  "Brainbees Solutions",
  "Brigade Enterprises",
  "C.E. Info Systems",
  "CCL Products",
  "CESC",
  "Campus Activewear",
  "Can Fin Homes",
  "Caplin Point Laboratories",
  "Capri Global Capital",
  "Carborundum Universal",
  "Castrol India",
  "Ceat",
  "Central Bank of India",
  "Central Depository Services",
  "Century Plyboards",
  "Cera Sanitaryware",
  "Chalet Hotels",
  "Chambal Fertilizers & Chemicals",
  "Chennai Petroleum Corporation",
  "Cholamandalam Financial Holdings",
  "City Union Bank",
  "Cohance Lifesciences",
  "Computer Age Management Services",
  "Concord Biotech",
  "Craftsman Automation",
  "CreditAccess Grameen",
  "Cyient",
  "DCM Shriram",
  "DOMS Industries",
  "Data Patterns India",
  "Deepak Fertilisers & Petrochemicals",
  "Devyani International",
  "Dummy Valor Estate",
  "E.I.D. Parry",
  "EIH",
  "Elecon Engineering",
  "Elgi Equipments",
  "Emcure Pharmaceuticals",
  "Engineers India",
  "Eris Lifesciences",
  "Fertilisers and Chemicals Travancore",
  "Finolex Cables",
  "Finolex Industries",
  "Firstsource Solutions",
  "Five-Star Business Finance",
  "Garden Reach Shipbuilders & Engineers",
  "Gillette India",
  "Go Digit General Insurance",
  "Godawari Power & Ispat",
  "Godfrey Phillips India",
  "Godrej Agrovet",
  "Granules India",
  "Graphite India",
  "Gravita India",
  "Great Eastern Shipping",
  "Gujarat Mineral Development Corporation",
  "Gujarat Narmada Valley Fertilizers & Chemicals",
  "Gujarat Pipavav Port",
  "H.E.G.",
  "HBL Engineering",
  "HFCL",
  "Happiest Minds Technologies",
  "Himadri Speciality Chemical",
  "Hindustan Copper",
  "Home First Finance Company India",
  "Honasa Consumer",
  "IDBI Bank",
  "IFCI",
  "IIFL Finance",
  "INOX India",
  "IRCON International",
  "ITI",
  "Indegene",
  "India Cements",
  "Indian Overseas Bank",
  "Inox Wind",
  "Intellect Design Arena",
  "International Gemmological Institute India",
  "Inventurus Knowledge Solutions",
  "J.B. Chemicals & Pharmaceuticals",
  "JBM Auto",
  "JK Tyre & Industries",
  "JM Financial",
  "JSW Holdings",
  "Jaiprakash Power Ventures",
  "Jammu & Kashmir Bank",
  "Jindal Saw",
  "Jubilant Ingrevia",
  "Jubilant Pharmova",
  "Jupiter Wagons",
  "Justdial",
  "Jyothy Labs",
  "Jyoti CNC Automation",
  "KNR Constructions",
  "Kajaria Ceramics",
  "Kalpataru Projects International",
  "Kansai Nerolac Paints",
  "Karur Vysya Bank",
  "Kaynes Technology India",
  "Kec International",
  "Kfin Technologies",
  "Kirloskar Brothers",
  "Kirloskar Oil Eng",
  "Krishna Institute of Medical Sciences",
  "LT Foods",
  "Latent View Analytics",
  "Lemon Tree Hotels",
  "MMTC",
  "Mahanagar Gas",
  "Maharashtra Seamless",
  "Manappuram Finance",
  "Mastek",
  "Metropolis Healthcare",
  "Minda Corporation",
  "Multi Commodity Exchange of India",
  "NATCO Pharma",
  "NBCC India",
  "NCC",
  "NMDC Steel",
  "Narayana Hrudayalaya",
  "Nava",
  "Netweb Technologies India",
  "Network18 Media & Investments",
  "Neuland Laboratories",
  "Newgen Software Technologies",
  "Niva Bupa Health Insurance",
  "Nuvama Wealth Management",
  "Olectra Greentech",
  "PCBL Chemical",
  "PG Electroplast",
  "PNB Housing Finance",
  "PNC Infratech",
  "PTC Industries",
  "PVR INOX",
  "Pfizer",
  "Piramal Enterprises",
  "Piramal Pharma",
  "Poly Medicure",
  "Praj Industries",
  "R R Kabel",
  "RBL Bank",
  "RHI Magnesita India",
  "RITES",
  "Radico Khaitan",
  "Railtel Corporation Of India",
  "Rainbow Childrens Medicare",
  "Ramkrishna Forgings",
  "Rashtriya Chemicals & Fertilizers",
  "RattanIndia Enterprises",
  "Raymond Lifestyle",
  "Raymond",
  "Redington",
  "Reliance Power",
  "Route Mobile",
  "SBFC Finance",
  "SKF India",
  "Sagility India",
  "Sai Life Sciences",
  "Sammaan Capital",
  "Sapphire Foods India",
  "Sarda Energy and Minerals",
  "Saregama India",
  "Schneider Electric Infrastructure",
  "Shipping Corporation of India",
  "Shree Renuka Sugars",
  "Shyam Metalics and Energy",
  "Signatureglobal India",
  "Sobha",
  "Sonata Software",
  "Sterling and Wilson Renewable Energy",
  "Sumitomo Chemical India",
  "Sundram Fasteners",
  "Swan Corp",
  "Syrma SGS Technology",
  "TBO Tek",
  "Tanla Platforms",
  "Tata Teleservices Maharashtra",
  "Techno Electric & Engineering",
  "Tejas Networks",
  "Timken India",
  "Titagarh Rail Systems",
  "Transformers And Rectifiers India",
  "Triveni Engineering & Industries",
  "Triveni Turbine",
  "UCO Bank",
  "UTI Asset Management Company",
  "Usha Martin",
  "V-Guard Industries",
  "Valor Estate",
  "Vardhman Textiles",
  "Vedant Fashions",
  "Vijaya Diagnostic Centre",
  "Welspun Corp",
  "Welspun Living",
  "Westlife Foodworld",
  "Wockhardt",
  "ZF Commercial Vehicle Control Systems India",
  "Zee Entertainment Enterprises",
  "Zen Technologies",
  "Zensar Technolgies",
  "eClerx Services",
];

// --- Helper to get stock with persistent index ---
function getNextStock() {
  const randomIndex = Math.floor(Math.random() * stocks.length);
  const stock = stocks[randomIndex];
  console.log(`🎲 Selected stock #${randomIndex}: ${stock}`);
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
    Generate a short stock analysis for ${stock} by referring to Pros and Cons sections of https://www.screener.in/
    Use the following format exactly:
    
    ** ${stock} **
    Pros - 
    Cons -
    
    Overall summary or conclusion
    
    No debt info please. Add 1-2 relevant hashtags & an emoji at the end.
    Strictly under 270 characters. Make it sound natural, not AI-generated.
    `;
    const stockTweet = await generateTweet(stockPrompt);
    await sendTweet(stockTweet);
  } catch (err) {
    console.error("❌ Error generating or sending tweet:", err);
  }
}

run();
