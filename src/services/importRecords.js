const axios = require("axios");
const logger = require("../utils/logger");

const IMPORTYETI_BASE = "https://www.importyeti.com";

// Target categories with representative search terms
const CATEGORY_QUERIES = {
  electronics: [
    "wireless earbuds bluetooth",
    "usb charging cable",
    "phone case accessories",
    "led strip lights",
    "power bank portable",
    "webcam camera",
    "smart home alexa",
    "gaming headset",
  ],
  accessories: [
    "phone holder mount",
    "laptop stand",
    "screen protector tempered glass",
    "keyboard mouse wireless",
    "cable organizer",
    "ring light selfie",
  ],
  consumer_goods: [
    "kitchen gadgets",
    "fitness tracker band",
    "portable speaker",
    "electric toothbrush",
    "air purifier",
    "robot vacuum",
  ],
};

const ALL_QUERIES = Object.values(CATEGORY_QUERIES).flat();

// Headers to mimic a real browser request
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.importyeti.com/",
  Origin: "https://www.importyeti.com",
};

async function searchImporters(query, page = 1) {
  try {
    const url = `${IMPORTYETI_BASE}/api/search`;
    const response = await axios.get(url, {
      params: { search: query, page, pageSize: 20 },
      headers: HEADERS,
      timeout: 12000,
    });
    return response.data;
  } catch (err) {
    logger.warn(`ImportYeti search failed for "${query}": ${err.message}`);
    return null;
  }
}

async function getCompanyShipments(companyName) {
  try {
    const slug = encodeURIComponent(companyName.toLowerCase().replace(/\s+/g, "-"));
    const response = await axios.get(`${IMPORTYETI_BASE}/api/company/${slug}`, {
      headers: HEADERS,
      timeout: 12000,
    });
    return response.data;
  } catch (err) {
    logger.warn(`Company lookup failed for "${companyName}": ${err.message}`);
    return null;
  }
}

// Returns deduplicated list of importers from China in target categories
async function findChineseImporters(categoryKey = "all", maxQueries = 4) {
  const queries =
    categoryKey === "all"
      ? ALL_QUERIES
      : CATEGORY_QUERIES[categoryKey] || ALL_QUERIES;

  const selected = queries.slice(0, maxQueries);
  const seen = new Set();
  const results = [];

  for (const query of selected) {
    logger.info(`ImportYeti searching: "${query}"`);
    const data = await searchImporters(query);

    if (data?.results?.length) {
      for (const record of data.results) {
        const company = normalizeCompanyName(record.consignee_name);
        if (!company || seen.has(company)) continue;

        const isFromChina =
          /china|cn|shenzhen|guangzhou|yiwu|hangzhou|dongguan|ningbo/i.test(
            `${record.shipper_name || ""} ${record.country_of_origin || ""} ${record.shipper_address || ""}`
          );

        if (!isFromChina) continue;

        seen.add(company);
        results.push({
          company,
          supplierName: record.shipper_name || "Unknown",
          supplierCountry: record.country_of_origin || "CN",
          productDescription: record.product_description || record.hs_code_description || "",
          category: detectCategory(record.product_description),
          portOfEntry: record.port_of_unlading || "",
          arrivalDate: record.arrival_date || "",
          weightKg: parseFloat(record.weight_kg) || 0,
          shipmentCount: record.shipment_count || 1,
          hsCode: record.hs_code || "",
          rawQuery: query,
        });
      }
    }

    // Polite delay between requests
    await sleep(1200);
  }

  return results;
}

function normalizeCompanyName(name) {
  if (!name) return null;
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s&.-]/g, "");
}

function detectCategory(description = "") {
  const d = description.toLowerCase();
  if (/earbu|headphone|speaker|audio|bluetooth|wireless|airpod/i.test(d)) return "Audio/Electronics";
  if (/phone|mobile|charger|cable|usb|adapter|case|screen/i.test(d)) return "Phone Accessories";
  if (/led|light|lamp|strip|bulb/i.test(d)) return "Lighting";
  if (/kitchen|cook|appliance|vacuum|air purif/i.test(d)) return "Home Appliances";
  if (/fitness|tracker|watch|band|sport/i.test(d)) return "Wearables";
  if (/gaming|game|controller|keyboard|mouse|webcam/i.test(d)) return "Gaming/PC";
  if (/laptop|computer|monitor|tablet/i.test(d)) return "Computing";
  return "Consumer Goods";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Score how likely a US importer also sells on Amazon (heuristic)
function scoreAmazonLikelihood(record) {
  let score = 0;

  // Small-to-medium companies more likely to be FBA sellers
  if (record.shipmentCount >= 3 && record.shipmentCount <= 100) score += 25;
  if (record.shipmentCount > 100) score += 10; // large = harder to convert

  // Weight range typical for e-commerce SKUs
  if (record.weightKg > 0 && record.weightKg < 5000) score += 20;

  // Consumer electronics categories are highly Amazon-centric
  if (/Audio|Phone|Gaming|Wearable/i.test(record.category)) score += 30;
  if (/Consumer Goods|Lighting|Home/i.test(record.category)) score += 20;

  // Miami port = already near our service area
  if (/miami|mia/i.test(record.portOfEntry)) score += 15;

  // Recent activity
  const daysSinceArrival = record.arrivalDate
    ? (Date.now() - new Date(record.arrivalDate)) / 86400000
    : 999;
  if (daysSinceArrival < 180) score += 10;

  return Math.min(score, 100);
}

module.exports = {
  searchImporters,
  getCompanyShipments,
  findChineseImporters,
  scoreAmazonLikelihood,
  detectCategory,
  CATEGORY_QUERIES,
};
