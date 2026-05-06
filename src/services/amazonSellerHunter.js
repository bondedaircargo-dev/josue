const Anthropic = require("@anthropic-ai/sdk");
const { format } = require("date-fns");
const { findChineseImporters, scoreAmazonLikelihood } = require("./importRecords");
const { appendRow, getRows } = require("./sheets");
const logger = require("../utils/logger");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROSPECTS_SHEET_RANGE = "AmazonProspects!A:N";
const PROSPECTS_SHEET_HEADER = [
  "Date",
  "Company",
  "Category",
  "Supplier (China)",
  "Product Description",
  "Port of Entry",
  "Weight (kg)",
  "Shipment Count",
  "Amazon Score",
  "Conversion Potential",
  "AI Analysis",
  "Status",
  "Contact",
  "Notes",
];

// ─── AI Enrichment ────────────────────────────────────────────────────────────

async function enrichProspect(record) {
  const prompt = `You are a logistics sales analyst for Bonded Air Cargo, a freight forwarder in Miami that handles air cargo Miami → Dominican Republic and Haiti, and also handles China → Miami imports.

Analyze this US importer who buys from China and likely sells on Amazon:

Company: ${record.company}
China Supplier: ${record.supplierName}
Product: ${record.productDescription}
Category: ${record.category}
Port of Entry: ${record.portOfEntry}
Annual Shipments: ${record.shipmentCount}
Weight per Shipment: ${record.weightKg} kg

Answer in JSON only (no markdown):
{
  "sellsOnAmazon": true/false,
  "confidence": 0-100,
  "bypassPotential": "high/medium/low",
  "reasoning": "1-2 sentence explanation",
  "pitch": "One compelling sentence to pitch them direct freight from China via Miami",
  "estimatedMonthlyVolumeLbs": number,
  "recommendedService": "air_freight/ocean_freight/both"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    logger.warn(`AI enrichment failed for ${record.company}: ${err.message}`);
    return {
      sellsOnAmazon: null,
      confidence: 0,
      bypassPotential: "unknown",
      reasoning: "Analysis unavailable",
      pitch: "",
      estimatedMonthlyVolumeLbs: 0,
      recommendedService: "air_freight",
    };
  }
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

async function saveProspectToSheet(record, aiData) {
  const sheetId = process.env.GOOGLE_SHEET_PROSPECTS_ID;
  if (!sheetId) {
    logger.warn("GOOGLE_SHEET_PROSPECTS_ID not set — skipping Sheets save");
    return null;
  }

  const row = [
    format(new Date(), "yyyy-MM-dd HH:mm"),
    record.company,
    record.category,
    record.supplierName,
    record.productDescription?.slice(0, 120) || "",
    record.portOfEntry,
    record.weightKg,
    record.shipmentCount,
    record.amazonScore,
    aiData?.bypassPotential || "unknown",
    aiData?.reasoning || "",
    "NEW",
    "",
    aiData?.pitch || "",
  ];

  return appendRow(sheetId, PROSPECTS_SHEET_RANGE, row);
}

async function getProspects() {
  const sheetId = process.env.GOOGLE_SHEET_PROSPECTS_ID;
  if (!sheetId) return [];

  const rows = await getRows(sheetId, PROSPECTS_SHEET_RANGE);
  if (rows.length === 0) return [];

  // Skip header row if present
  const dataRows = rows[0][0] === "Date" ? rows.slice(1) : rows;

  return dataRows.map((row) => ({
    date: row[0] || "",
    company: row[1] || "",
    category: row[2] || "",
    supplier: row[3] || "",
    productDescription: row[4] || "",
    portOfEntry: row[5] || "",
    weightKg: row[6] || "",
    shipmentCount: row[7] || "",
    amazonScore: row[8] || "",
    bypassPotential: row[9] || "",
    aiAnalysis: row[10] || "",
    status: row[11] || "NEW",
    contact: row[12] || "",
    notes: row[13] || "",
  }));
}

// ─── Main Hunt ────────────────────────────────────────────────────────────────

async function runHunt(options = {}) {
  const {
    category = "all",
    maxQueries = 4,
    enrichWithAI = true,
    saveToSheets = true,
    minAmazonScore = 40,
  } = options;

  logger.info(`Amazon Seller Hunt started — category: ${category}`);

  const importers = await findChineseImporters(category, maxQueries);
  logger.info(`Found ${importers.length} Chinese importers`);

  const prospects = [];

  for (const record of importers) {
    record.amazonScore = scoreAmazonLikelihood(record);

    if (record.amazonScore < minAmazonScore) continue;

    let aiData = null;
    if (enrichWithAI) {
      aiData = await enrichProspect(record);
      logger.info(
        `Enriched ${record.company}: bypassPotential=${aiData.bypassPotential} confidence=${aiData.confidence}`
      );
    }

    if (saveToSheets) {
      await saveProspectToSheet(record, aiData);
    }

    prospects.push({
      ...record,
      ai: aiData,
    });
  }

  const summary = {
    total: importers.length,
    qualified: prospects.length,
    highPotential: prospects.filter((p) => p.ai?.bypassPotential === "high").length,
    mediumPotential: prospects.filter((p) => p.ai?.bypassPotential === "medium").length,
    savedToSheets: saveToSheets,
  };

  logger.info(`Hunt complete: ${summary.qualified} qualified out of ${summary.total}`);
  return { prospects, summary };
}

// ─── Single prospect enrichment (for manual trigger) ─────────────────────────

async function enrichSingleProspect(companyData) {
  const record = {
    company: companyData.company || companyData.name,
    supplierName: companyData.supplier || companyData.supplierName || "Unknown",
    productDescription: companyData.product || companyData.productDescription || "",
    category: companyData.category || "Consumer Goods",
    portOfEntry: companyData.port || companyData.portOfEntry || "",
    shipmentCount: parseInt(companyData.shipments || companyData.shipmentCount) || 1,
    weightKg: parseFloat(companyData.weight || companyData.weightKg) || 0,
  };

  record.amazonScore = scoreAmazonLikelihood(record);
  const aiData = await enrichProspect(record);

  return { ...record, ai: aiData };
}

module.exports = {
  runHunt,
  enrichSingleProspect,
  enrichProspect,
  saveProspectToSheet,
  getProspects,
  PROSPECTS_SHEET_HEADER,
};
