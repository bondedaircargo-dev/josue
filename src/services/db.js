// Database service — PostgreSQL when DATABASE_URL is set, in-memory Maps otherwise
// Routes call this service identically in both modes; no route code changes needed.

const logger = require("../utils/logger");

let pool = null;
let usingPostgres = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  if (!process.env.DATABASE_URL) {
    logger.info("DB: no DATABASE_URL — using in-memory store (data resets on restart)");
    return;
  }

  try {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
    await pool.query("SELECT 1");
    usingPostgres = true;
    logger.info("DB: connected to PostgreSQL ✓");
  } catch (err) {
    logger.warn(`DB: PostgreSQL connection failed (${err.message}) — falling back to in-memory`);
    pool = null;
  }
}

function isPostgres() { return usingPostgres; }

// ─── Generic query (used by store functions) ──────────────────────────────────
async function query(sql, params = []) {
  if (!pool) throw new Error("PostgreSQL not connected");
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ─── TABLE HELPERS ────────────────────────────────────────────────────────────
// Each helper wraps a specific table with CRUD that mirrors the in-memory Map API

// ── customers ─────────────────────────────────────────────────────────────────
const dbCustomers = {
  async get(phone) {
    const r = await query("SELECT * FROM customers WHERE phone = $1", [phone]);
    return r.rows[0] ? toCustomer(r.rows[0]) : null;
  },
  async getByCrn(crn) {
    const r = await query("SELECT * FROM customers WHERE crn = $1", [crn]);
    return r.rows[0] ? toCustomer(r.rows[0]) : null;
  },
  async search(term) {
    const r = await query(
      "SELECT * FROM customers WHERE phone ILIKE $1 OR email ILIKE $1 OR crn ILIKE $1 OR name ILIKE $1 LIMIT 20",
      [`%${term}%`]
    );
    return r.rows.map(toCustomer);
  },
  async list(filters = {}) {
    let sql = "SELECT * FROM customers WHERE 1=1";
    const params = [];
    if (filters.company) { params.push(filters.company.toUpperCase()); sql += ` AND company = $${params.length}`; }
    if (filters.country) { params.push(filters.country.toUpperCase()); sql += ` AND country = $${params.length}`; }
    sql += " ORDER BY created_at DESC";
    const r = await query(sql, params);
    return r.rows.map(toCustomer);
  },
  async upsert(c) {
    await query(
      `INSERT INTO customers (crn,phone,name,email,address,country,company,tier,tags,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (phone) DO UPDATE SET
         name=$3,email=$4,address=$5,country=$6,tier=$8,tags=$9,notes=$10,updated_at=NOW()`,
      [c.crn, c.phone, c.name, c.email||null, c.address||null, c.country||'DO',
       c.company||'MCP', c.tier||'standard', c.tags||[], c.notes||null]
    );
    return this.get(c.phone);
  },
};

function toCustomer(r) {
  return { crn: r.crn, id: r.phone, name: r.name, phone: r.phone, email: r.email,
    address: r.address, country: r.country, company: r.company, tier: r.tier,
    tags: r.tags||[], notes: r.notes, totalSpent: parseFloat(r.total_spent)||0,
    createdAt: r.created_at, updatedAt: r.updated_at };
}

// ── shipments ─────────────────────────────────────────────────────────────────
const dbShipments = {
  async getByRef(ref) {
    const r = await query("SELECT * FROM shipments WHERE crn=$1 OR awb=$1", [ref.toUpperCase()]);
    return r.rows[0] ? toShipment(r.rows[0]) : null;
  },
  async list(filters = {}) {
    let sql = "SELECT * FROM shipments WHERE 1=1";
    const params = [];
    if (filters.status)  { params.push(filters.status.toUpperCase()); sql += ` AND status=$${params.length}`; }
    if (filters.company) { params.push(filters.company.toUpperCase()); sql += ` AND company=$${params.length}`; }
    sql += " ORDER BY created_at DESC";
    const r = await query(sql, params);
    return r.rows.map(toShipment);
  },
  async upsert(s) {
    await query(
      `INSERT INTO shipments (crn,awb,company,customer_name,customer_phone,customer_email,
        customer_address,shipper_name,destination,destination_airport,weight,pieces,
        description,value,notes,flight_date,flight_number,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (crn) DO UPDATE SET
         status=$18,updated_at=NOW()`,
      [s.crn,s.awb,s.company,s.customerName,s.customerPhone,s.customerEmail||null,
       s.customerAddress||null,s.shipperName||null,s.destination,s.destinationAirport||null,
       s.weight,s.pieces||1,s.description||'General cargo',s.value||0,s.notes||null,
       s.flightDate||null,s.flightNumber||null,s.status||'RECIBIDO']
    );
    await query(
      "INSERT INTO shipment_status_history (shipment_crn,status,note) VALUES ($1,$2,$3)",
      [s.crn, s.status||'RECIBIDO', s.note||null]
    );
    return this.getByRef(s.crn);
  },
  async updateStatus(crn, status, note) {
    await query("UPDATE shipments SET status=$1,updated_at=NOW() WHERE crn=$2", [status, crn]);
    await query("INSERT INTO shipment_status_history(shipment_crn,status,note) VALUES($1,$2,$3)", [crn, status, note||null]);
    return this.getByRef(crn);
  },
};

function toShipment(r) {
  return { crn: r.crn, awb: r.awb, company: r.company, customerName: r.customer_name,
    customerPhone: r.customer_phone, customerEmail: r.customer_email,
    destination: r.destination, weight: parseFloat(r.weight), pieces: r.pieces,
    description: r.description, value: parseFloat(r.value)||0, status: r.status,
    flightDate: r.flight_date, flightNumber: r.flight_number,
    createdAt: r.created_at, updatedAt: r.updated_at };
}

// ── complaints ────────────────────────────────────────────────────────────────
const dbComplaints = {
  async get(crn) {
    const r = await query("SELECT * FROM complaints WHERE crn=$1", [crn]);
    return r.rows[0] ? toComplaint(r.rows[0]) : null;
  },
  async list(filters = {}) {
    let sql = "SELECT * FROM complaints WHERE 1=1";
    const params = [];
    if (filters.status)  { params.push(filters.status); sql += ` AND status=$${params.length}`; }
    if (filters.company) { params.push(filters.company.toUpperCase()); sql += ` AND company=$${params.length}`; }
    if (filters.type)    { params.push(filters.type); sql += ` AND type=$${params.length}`; }
    sql += " ORDER BY CASE WHEN status='abierto' THEN 0 ELSE 1 END, created_at DESC";
    const r = await query(sql, params);
    return r.rows.map(toComplaint);
  },
  async upsert(c) {
    await query(
      `INSERT INTO complaints (crn,company,customer_name,customer_phone,awb,type,description,amount,evidence,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (crn) DO UPDATE SET status=$10,updated_at=NOW()`,
      [c.crn,c.company,c.customerName,c.customerPhone,c.awb||null,c.type,
       c.description||null,c.amount||0,JSON.stringify(c.evidence||[]),c.status||'abierto']
    );
    await query("INSERT INTO complaint_status_history(complaint_crn,status,note) VALUES($1,$2,$3)",
      [c.crn, c.status||'abierto', c.note||null]);
    return this.get(c.crn);
  },
  async updateStatus(crn, status, note, resolution) {
    await query("UPDATE complaints SET status=$1,resolution=$2,updated_at=NOW() WHERE crn=$3",
      [status, resolution||null, crn]);
    await query("INSERT INTO complaint_status_history(complaint_crn,status,note) VALUES($1,$2,$3)",
      [crn, status, note||null]);
    return this.get(crn);
  },
};

function toComplaint(r) {
  return { crn: r.crn, company: r.company, customerName: r.customer_name,
    customerPhone: r.customer_phone, awb: r.awb, type: r.type,
    description: r.description, amount: parseFloat(r.amount)||0,
    evidence: r.evidence||[], status: r.status, resolution: r.resolution,
    assignedTo: r.assigned_to, createdAt: r.created_at, updatedAt: r.updated_at };
}

// ── payments ──────────────────────────────────────────────────────────────────
const dbPayments = {
  async get(crn) {
    const r = await query("SELECT * FROM payments WHERE crn=$1", [crn]);
    return r.rows[0] ? toPayment(r.rows[0]) : null;
  },
  async list(filters = {}) {
    let sql = "SELECT * FROM payments WHERE 1=1";
    const params = [];
    if (filters.status)  { params.push(filters.status); sql += ` AND status=$${params.length}`; }
    if (filters.company) { params.push(filters.company.toUpperCase()); sql += ` AND company=$${params.length}`; }
    sql += " ORDER BY created_at DESC";
    const r = await query(sql, params);
    return r.rows.map(toPayment);
  },
  async pending(company) {
    const params = ['pendiente'];
    let sql = "SELECT * FROM payments WHERE status=$1";
    if (company) { params.push(company.toUpperCase()); sql += ` AND company=$${params.length}`; }
    const r = await query(sql, params);
    return r.rows.map(toPayment);
  },
  async upsert(p) {
    await query(
      `INSERT INTO payments (crn,company,customer_name,customer_phone,amount,method,related_crn,description,proof_url,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (crn) DO UPDATE SET status=$10,updated_at=NOW()`,
      [p.crn,p.company,p.customerName,p.customerPhone,p.amount,p.method,
       p.relatedCrn||null,p.description||null,p.proofUrl||null,p.status||'pendiente']
    );
    return this.get(p.crn);
  },
  async updateStatus(crn, status, note, confirmedBy) {
    await query("UPDATE payments SET status=$1,confirmed_by=$2,updated_at=NOW() WHERE crn=$3",
      [status, confirmedBy||null, crn]);
    await query("INSERT INTO payment_status_history(payment_crn,status,note) VALUES($1,$2,$3)",
      [crn, status, note||null]);
    return this.get(crn);
  },
};

function toPayment(r) {
  return { crn: r.crn, company: r.company, customerName: r.customer_name,
    customerPhone: r.customer_phone, amount: parseFloat(r.amount),
    method: r.method, relatedCrn: r.related_crn, description: r.description,
    proofUrl: r.proof_url, status: r.status, confirmedBy: r.confirmed_by,
    createdAt: r.created_at, updatedAt: r.updated_at };
}

// ── inbox ─────────────────────────────────────────────────────────────────────
const dbInbox = {
  async push(msg) {
    await query(
      `INSERT INTO inbox_messages (id,"from",customer_name,company,text,lang,category,read,timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [msg.id,msg.from,msg.customerName,msg.company,msg.text,msg.lang,msg.category,false,msg.timestamp||new Date()]
    );
  },
  async list(filters = {}) {
    let sql = `SELECT * FROM inbox_messages WHERE 1=1`;
    const params = [];
    if (filters.company)  { params.push(filters.company.toUpperCase()); sql += ` AND company=$${params.length}`; }
    if (filters.unread)   { sql += ` AND read=FALSE`; }
    if (filters.category) { params.push(filters.category); sql += ` AND category=$${params.length}`; }
    sql += " ORDER BY timestamp DESC LIMIT 500";
    const r = await query(sql, params);
    return r.rows.map(m => ({ id: m.id, from: m.from, customerName: m.customer_name,
      company: m.company, text: m.text, lang: m.lang, category: m.category,
      read: m.read, readAt: m.read_at, assignedAgent: m.assigned_agent, timestamp: m.timestamp }));
  },
  async markRead(id) {
    await query("UPDATE inbox_messages SET read=TRUE,read_at=NOW() WHERE id=$1", [id]);
  },
  async clearRead() {
    await query("DELETE FROM inbox_messages WHERE read=TRUE");
  },
};

// ── franchises ────────────────────────────────────────────────────────────────
const dbFranchises = {
  async get(crn) {
    const r = await query("SELECT * FROM franchises WHERE crn=$1", [crn]);
    return r.rows[0] ? toFranchise(r.rows[0]) : null;
  },
  async list(filters = {}) {
    let sql = "SELECT * FROM franchises WHERE 1=1";
    const params = [];
    if (filters.status)  { params.push(filters.status); sql += ` AND status=$${params.length}`; }
    if (filters.company) { params.push(filters.company.toUpperCase()); sql += ` AND company=$${params.length}`; }
    sql += " ORDER BY created_at DESC";
    const r = await query(sql, params);
    return r.rows.map(toFranchise);
  },
  async upsert(f) {
    await query(
      `INSERT INTO franchises (crn,company,owner_name,owner_phone,owner_email,city,country,
        has_location,experience,investment_capacity,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (crn) DO UPDATE SET status=$11,updated_at=NOW()`,
      [f.crn,f.company,f.ownerName,f.ownerPhone,f.ownerEmail||null,f.city,
       f.country||'DO',f.hasLocation||false,f.experience||null,
       f.investmentCapacity||0,f.status||'prospecto',f.notes||null]
    );
    return this.get(f.crn);
  },
  async updateStatus(crn, status, note) {
    await query("UPDATE franchises SET status=$1,updated_at=NOW() WHERE crn=$2", [status, crn]);
    await query("INSERT INTO franchise_status_history(franchise_crn,status,note) VALUES($1,$2,$3)",
      [crn, status, note||null]);
    return this.get(crn);
  },
};

function toFranchise(r) {
  return { crn: r.crn, company: r.company, ownerName: r.owner_name, ownerPhone: r.owner_phone,
    ownerEmail: r.owner_email, city: r.city, country: r.country, hasLocation: r.has_location,
    experience: r.experience, investmentCapacity: parseFloat(r.investment_capacity)||0,
    status: r.status, notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at };
}

module.exports = {
  init,
  isPostgres,
  query,
  customers: dbCustomers,
  shipments: dbShipments,
  complaints: dbComplaints,
  payments: dbPayments,
  franchises: dbFranchises,
  inbox: dbInbox,
};
