-- ═══════════════════════════════════════════════════════════════════════════
-- VORTEX GROUP — AI OPERATIONS SYSTEM
-- Schema inicial completo para PostgreSQL / Supabase
-- Ejecutar: psql $DATABASE_URL -f supabase/migrations/001_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- búsqueda de texto

-- ─── CUSTOMERS (CRM) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crn           VARCHAR(50) UNIQUE NOT NULL,
  phone         VARCHAR(30) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(200),
  address       TEXT,
  country       CHAR(2) DEFAULT 'DO',
  company       CHAR(5) NOT NULL DEFAULT 'MCP',
  tier          VARCHAR(20) DEFAULT 'standard',
  tags          TEXT[]   DEFAULT '{}',
  notes         TEXT,
  total_spent   DECIMAL(12,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone   ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
CREATE INDEX IF NOT EXISTS idx_customers_crn     ON customers(crn);
CREATE INDEX IF NOT EXISTS idx_customers_name    ON customers USING gin(name gin_trgm_ops);

-- ─── SHIPMENTS (TRACKING) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crn                 VARCHAR(50) UNIQUE NOT NULL,
  awb                 VARCHAR(50) UNIQUE NOT NULL,
  company             CHAR(5) NOT NULL DEFAULT 'MCP',
  customer_name       VARCHAR(200) NOT NULL,
  customer_phone      VARCHAR(30) NOT NULL,
  customer_email      VARCHAR(200),
  customer_address    TEXT,
  shipper_name        VARCHAR(200),
  destination         VARCHAR(200) NOT NULL,
  destination_airport VARCHAR(10),
  weight              DECIMAL(10,2) NOT NULL,
  pieces              INTEGER DEFAULT 1,
  description         TEXT DEFAULT 'General cargo',
  value               DECIMAL(12,2) DEFAULT 0,
  notes               TEXT,
  flight_date         DATE,
  flight_number       VARCHAR(20),
  status              VARCHAR(20) DEFAULT 'RECIBIDO'
                        CHECK (status IN ('RECIBIDO','ALMACEN','EN_TRANSITO','EN_ADUANA','DISPONIBLE','ENTREGADO','RETENIDO')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_crn VARCHAR(50) NOT NULL REFERENCES shipments(crn) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_company ON shipments(company);
CREATE INDEX IF NOT EXISTS idx_shipments_status  ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_phone   ON shipments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_shipments_crn     ON shipments(crn);

-- ─── INVOICES (FACTURAS) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crn             VARCHAR(50) UNIQUE NOT NULL,
  company         CHAR(5) NOT NULL DEFAULT 'MCP',
  customer_name   VARCHAR(200) NOT NULL,
  customer_phone  VARCHAR(30),
  customer_email  VARCHAR(200),
  shipment_crn    VARCHAR(50),
  destination     VARCHAR(200),
  items           JSONB NOT NULL DEFAULT '[]',
  tax_rate        DECIMAL(5,4) DEFAULT 0,
  notes           TEXT,
  status          VARCHAR(20) DEFAULT 'PENDIENTE'
                    CHECK (status IN ('PENDIENTE','PAGADA','CANCELADA')),
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);

-- ─── COMPLAINTS (QUEJAS Y RECLAMOS) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crn             VARCHAR(50) UNIQUE NOT NULL,
  company         CHAR(5) NOT NULL DEFAULT 'MCP',
  customer_name   VARCHAR(200) NOT NULL,
  customer_phone  VARCHAR(30) NOT NULL,
  awb             VARCHAR(50),
  type            VARCHAR(30) NOT NULL
                    CHECK (type IN ('perdido','dañado','retraso','cobro_incorrecto','entrega_fallida','otro')),
  description     TEXT,
  amount          DECIMAL(12,2) DEFAULT 0,
  evidence        JSONB DEFAULT '[]',
  status          VARCHAR(20) DEFAULT 'abierto'
                    CHECK (status IN ('abierto','en_revision','resuelto','cerrado')),
  assigned_to     JSONB,
  resolution      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_crn VARCHAR(50) NOT NULL REFERENCES complaints(crn) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_company ON complaints(company);
CREATE INDEX IF NOT EXISTS idx_complaints_status  ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_type    ON complaints(type);

-- ─── FRANCHISES (FRANQUICIAS) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchises (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crn                  VARCHAR(50) UNIQUE NOT NULL,
  company              CHAR(5) NOT NULL DEFAULT 'MCP',
  owner_name           VARCHAR(200) NOT NULL,
  owner_phone          VARCHAR(30) NOT NULL,
  owner_email          VARCHAR(200),
  city                 VARCHAR(100) NOT NULL,
  country              CHAR(2) DEFAULT 'DO',
  has_location         BOOLEAN DEFAULT FALSE,
  experience           TEXT,
  investment_capacity  DECIMAL(12,2) DEFAULT 0,
  status               VARCHAR(30) DEFAULT 'prospecto'
                         CHECK (status IN ('prospecto','en_evaluacion','aprobado','en_entrenamiento','activo','inactivo','rechazado')),
  assigned_to          JSONB,
  notes                TEXT,
  documents            JSONB DEFAULT '[]',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS franchise_status_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_crn VARCHAR(50) NOT NULL REFERENCES franchises(crn) ON DELETE CASCADE,
  status        VARCHAR(30) NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_franchises_company ON franchises(company);
CREATE INDEX IF NOT EXISTS idx_franchises_status  ON franchises(status);

-- ─── PAYMENTS (PAGOS) ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crn             VARCHAR(50) UNIQUE NOT NULL,
  company         CHAR(5) NOT NULL DEFAULT 'MCP',
  customer_name   VARCHAR(200) NOT NULL,
  customer_phone  VARCHAR(30) NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  method          VARCHAR(30) NOT NULL
                    CHECK (method IN ('zelle','cash_app','efectivo','transferencia','tarjeta','otro')),
  related_crn     VARCHAR(50),
  description     TEXT,
  proof_url       TEXT,
  status          VARCHAR(20) DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','en_proceso','confirmado','rechazado','reembolsado')),
  confirmed_by    VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_crn VARCHAR(50) NOT NULL REFERENCES payments(crn) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_phone   ON payments(customer_phone);

-- ─── DELIVERIES (ENTREGAS) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crn              VARCHAR(50) UNIQUE NOT NULL,
  company          CHAR(5) NOT NULL DEFAULT 'MCP',
  shipment_crn     VARCHAR(50),
  customer_name    VARCHAR(200),
  customer_phone   VARCHAR(30) NOT NULL,
  delivery_address TEXT NOT NULL,
  city             VARCHAR(100),
  zone             VARCHAR(100),
  scheduled_date   DATE NOT NULL,
  driver_name      VARCHAR(200),
  driver_phone     VARCHAR(30),
  route_id         VARCHAR(50),
  status           VARCHAR(20) DEFAULT 'programado'
                     CHECK (status IN ('programado','en_ruta','entregado','fallido','reagendado','devuelto')),
  proof_of_delivery JSONB,
  failure_reason   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_status_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_crn VARCHAR(50) NOT NULL REFERENCES deliveries(crn) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_company ON deliveries(company);
CREATE INDEX IF NOT EXISTS idx_deliveries_date    ON deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status  ON deliveries(status);

-- ─── ROUTES (RUTAS DE REPARTO) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id      VARCHAR(50) UNIQUE NOT NULL,
  company       CHAR(5) NOT NULL DEFAULT 'MCP',
  date          DATE NOT NULL,
  driver_name   VARCHAR(200) NOT NULL,
  driver_phone  VARCHAR(30),
  zone          VARCHAR(100),
  delivery_crns TEXT[] DEFAULT '{}',
  status        VARCHAR(20) DEFAULT 'pendiente',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INBOX MESSAGES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inbox_messages (
  id            VARCHAR(100) PRIMARY KEY,
  "from"        VARCHAR(30) NOT NULL,
  customer_name VARCHAR(200),
  company       CHAR(5) NOT NULL DEFAULT 'MCP',
  text          TEXT,
  lang          CHAR(2) DEFAULT 'es',
  category      VARCHAR(30),
  read          BOOLEAN DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  assigned_agent JSONB,
  timestamp     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_company  ON inbox_messages(company);
CREATE INDEX IF NOT EXISTS idx_inbox_read     ON inbox_messages(read);
CREATE INDEX IF NOT EXISTS idx_inbox_category ON inbox_messages(category);
CREATE INDEX IF NOT EXISTS idx_inbox_ts       ON inbox_messages(timestamp DESC);

-- ─── AGENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id              VARCHAR(50) PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  phone           VARCHAR(30),
  companies       TEXT[] DEFAULT '{"MCP"}',
  skills          TEXT[] DEFAULT '{"operacion"}',
  active          BOOLEAN DEFAULT TRUE,
  assigned_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed: agentes iniciales ──────────────────────────────────────────────────
INSERT INTO agents (id, name, companies, skills) VALUES
  ('agent_001', 'Carlos',  '{"MCP","GPK"}',        '{"tracking","cotizacion","operacion"}'),
  ('agent_002', 'Maria',   '{"GPK","ONE"}',         '{"reclamacion","queja","pago","factura"}'),
  ('agent_003', 'Roberto', '{"VTX","MCP"}',         '{"cliente_grande","franquicia","cotizacion"}')
ON CONFLICT (id) DO NOTHING;

-- ─── Función updated_at automático ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['customers','shipments','invoices','complaints','franchises','payments','deliveries','agents']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl, tbl);
  END LOOP;
END $$;
