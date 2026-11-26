CREATE TABLE IF NOT EXISTS portal_public_sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS portal_public_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  site_id TEXT NOT NULL REFERENCES portal_public_sites(id),
  is_public BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO portal_public_sites (id, name, city, address)
VALUES
  ('s1', 'Centro de Servicios y Gestión Empresarial', 'Bogotá', 'Av. Caracas # 13-88'),
  ('s2', 'Centro de Electricidad, Electrónica y Telecomunicaciones', 'Bogotá', 'Cra. 30 # 17B-25')
ON CONFLICT (id) DO NOTHING;

INSERT INTO portal_public_programs (id, name, code, site_id)
VALUES
  ('p1', 'Análisis y Desarrollo de Software', '228118', 's1'),
  ('p2', 'Gestión Administrativa', '122115', 's1'),
  ('p3', 'Gestión Empresarial', '122116', 's2')
ON CONFLICT (id) DO NOTHING;
