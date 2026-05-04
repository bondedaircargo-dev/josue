// Multi-tenant company registry for Vortex Group
// Each company has its own WhatsApp number, email, and branding

const COMPANIES = {
  VTX: {
    id: "VTX",
    name: "Vortex",
    fullName: "Vortex Group",
    phoneNumberId: process.env.VTX_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID,
    waToken: process.env.VTX_WA_TOKEN || process.env.WHATSAPP_TOKEN,
    email: process.env.VTX_EMAIL || process.env.GMAIL_USER,
    type: "forwarder",
    routes: ["China → Miami → RD", "China → Miami → Haiti"],
    tier: "premium",
    minWeight: 5,
    ratePerLb: 3.0,
    description: "Carga internacional premium. Clientes grandes, bundles, forwarders.",
  },
  MCP: {
    id: "MCP",
    name: "MCPack",
    fullName: "MCPack / EGA",
    phoneNumberId: process.env.MCP_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID,
    waToken: process.env.MCP_WA_TOKEN || process.env.WHATSAPP_TOKEN,
    email: process.env.MCP_EMAIL || process.env.GMAIL_USER,
    type: "courier",
    routes: ["Miami → RD", "Miami → Haiti"],
    tier: "standard",
    minWeight: 5,
    ratePerLb: 3.5,
    description: "Courier completo Miami → RD y Haití.",
  },
  GPK: {
    id: "GPK",
    name: "GoPack",
    fullName: "GoPack Courier",
    phoneNumberId: process.env.GPK_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID,
    waToken: process.env.GPK_WA_TOKEN || process.env.WHATSAPP_TOKEN,
    email: process.env.GPK_EMAIL || process.env.GMAIL_USER,
    type: "courier",
    routes: ["Miami → RD", "Miami → Haiti"],
    tier: "standard",
    minWeight: 5,
    ratePerLb: 3.5,
    description: "Courier económico Miami → RD y Haití.",
  },
  ONE: {
    id: "ONE",
    name: "One Courier",
    fullName: "One Courier",
    phoneNumberId: process.env.ONE_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID,
    waToken: process.env.ONE_WA_TOKEN || process.env.WHATSAPP_TOKEN,
    email: process.env.ONE_EMAIL || process.env.GMAIL_USER,
    type: "courier",
    routes: ["Miami → RD", "Miami → Haiti"],
    tier: "standard",
    minWeight: 5,
    ratePerLb: 3.5,
    description: "Courier express Miami → RD y Haití.",
  },
};

// Resolve company from incoming phone number ID (multi-brand webhook routing)
function getCompanyByPhoneId(phoneNumberId) {
  return (
    Object.values(COMPANIES).find((c) => c.phoneNumberId === phoneNumberId) ||
    COMPANIES.MCP
  );
}

function getCompanyById(id) {
  return COMPANIES[(id || "MCP").toUpperCase()] || COMPANIES.MCP;
}

function getAllCompanyIds() {
  return Object.keys(COMPANIES);
}

module.exports = { COMPANIES, getCompanyByPhoneId, getCompanyById, getAllCompanyIds };
