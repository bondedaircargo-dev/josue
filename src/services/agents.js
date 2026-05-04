// Agent assignment and escalation service
// Round-robin load balancing across active agents per company

const logger = require("../utils/logger");

// In-memory agent registry (replace with DB in production)
const agentRegistry = new Map([
  [
    "agent_001",
    {
      id: "agent_001",
      name: "Carlos",
      phone: process.env.AGENT_1_PHONE || "",
      companies: ["MCP", "GPK"],
      active: true,
      assignedCount: 0,
      skills: ["tracking", "cotizacion", "operacion"],
    },
  ],
  [
    "agent_002",
    {
      id: "agent_002",
      name: "Maria",
      phone: process.env.AGENT_2_PHONE || "",
      companies: ["GPK", "ONE"],
      active: true,
      assignedCount: 0,
      skills: ["reclamacion", "queja", "pago", "factura"],
    },
  ],
  [
    "agent_003",
    {
      id: "agent_003",
      name: "Roberto",
      phone: process.env.AGENT_3_PHONE || "",
      companies: ["VTX", "MCP"],
      active: true,
      assignedCount: 0,
      skills: ["cliente_grande", "franquicia", "cotizacion"],
    },
  ],
]);

// conversationKey (phone + company) → agentId
const assignments = new Map();

// Assign best available agent for a conversation, optionally filtered by company and skill
function assignAgent(conversationKey, companyId = null, skill = null) {
  const available = Array.from(agentRegistry.values()).filter((a) => {
    if (!a.active) return false;
    if (companyId && !a.companies.includes(companyId)) return false;
    if (skill && !a.skills.includes(skill)) return false;
    return true;
  });

  // Fallback: any active agent if no match for company/skill
  const pool =
    available.length > 0
      ? available
      : Array.from(agentRegistry.values()).filter((a) => a.active);

  if (!pool.length) return null;

  const agent = pool.sort((a, b) => a.assignedCount - b.assignedCount)[0];
  agent.assignedCount++;
  assignments.set(conversationKey, agent.id);
  logger.info(`Agent ${agent.name} assigned to ${conversationKey}`);
  return agent;
}

function getAssignment(conversationKey) {
  const id = assignments.get(conversationKey);
  return id ? agentRegistry.get(id) : null;
}

function releaseAssignment(conversationKey) {
  const id = assignments.get(conversationKey);
  if (id) {
    const agent = agentRegistry.get(id);
    if (agent && agent.assignedCount > 0) agent.assignedCount--;
    assignments.delete(conversationKey);
  }
}

function listAgents() {
  return Array.from(agentRegistry.values());
}

function getAgent(agentId) {
  return agentRegistry.get(agentId) || null;
}

function upsertAgent(agentId, data) {
  const existing = agentRegistry.get(agentId) || { id: agentId, assignedCount: 0 };
  const updated = { ...existing, ...data, id: agentId };
  agentRegistry.set(agentId, updated);
  return updated;
}

function deleteAgent(agentId) {
  releaseAssignment(agentId);
  return agentRegistry.delete(agentId);
}

function getAssignmentStats() {
  return Array.from(agentRegistry.values()).map((a) => ({
    id: a.id,
    name: a.name,
    active: a.active,
    assignedCount: a.assignedCount,
    companies: a.companies,
  }));
}

module.exports = {
  assignAgent,
  getAssignment,
  releaseAssignment,
  listAgents,
  getAgent,
  upsertAgent,
  deleteAgent,
  getAssignmentStats,
};
