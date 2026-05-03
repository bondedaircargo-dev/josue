const axios = require("axios");
const logger = require("../utils/logger");

const BASE_URL = "https://graph.facebook.com/v19.0";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.META_ADS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function getAdAccountInsights(fields = "impressions,clicks,spend,reach", datePreset = "last_7d") {
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  const url = `${BASE_URL}/act_${accountId}/insights`;
  const res = await axios.get(url, {
    params: { fields, date_preset: datePreset, access_token: process.env.META_ADS_TOKEN },
  });
  logger.info("Meta Ads insights fetched");
  return res.data;
}

async function getCampaigns(status = "ACTIVE") {
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  const url = `${BASE_URL}/act_${accountId}/campaigns`;
  const res = await axios.get(url, {
    params: {
      fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time",
      effective_status: JSON.stringify([status]),
      access_token: process.env.META_ADS_TOKEN,
    },
  });
  return res.data;
}

async function createCampaign({ name, objective, dailyBudget, startTime, stopTime }) {
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  const url = `${BASE_URL}/act_${accountId}/campaigns`;
  const payload = {
    name,
    objective,
    status: "PAUSED",
    daily_budget: Math.round(dailyBudget * 100),
    start_time: startTime,
    stop_time: stopTime,
    access_token: process.env.META_ADS_TOKEN,
  };
  const res = await axios.post(url, payload);
  logger.info(`Meta Ads campaign created: ${name}`);
  return res.data;
}

async function getLeads(formId) {
  const url = `${BASE_URL}/${formId}/leads`;
  const res = await axios.get(url, {
    params: {
      fields: "id,created_time,field_data",
      access_token: process.env.META_ADS_TOKEN,
    },
  });
  return res.data;
}

module.exports = { getAdAccountInsights, getCampaigns, createCampaign, getLeads };
