-- Ejecutar una vez sobre la misma base de datos de CineMax.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS usuario_rol (
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo VARCHAR(30) NOT NULL CHECK (modulo IN ('cinemax','sunat')),
  rol VARCHAR(40) NOT NULL,
  PRIMARY KEY (id_usuario, modulo)
);

CREATE TABLE IF NOT EXISTS solicitudes_clave_sol (
  id BIGSERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id),
  razon_social VARCHAR(180) NOT NULL,
  ruc VARCHAR(11) NOT NULL CHECK (ruc ~ '^[0-9]{11}$'),
  representante VARCHAR(160) NOT NULL,
  correo VARCHAR(180) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en proceso','aprobada','rechazado')),
  codigo_seguimiento VARCHAR(40) UNIQUE,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por INTEGER REFERENCES usuarios(id),
  actualizado_en TIMESTAMPTZ
  ,clave_sol VARCHAR(120)
  ,clave_sol_activa_hasta TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS observaciones (
  id BIGSERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES usuarios(id),
  id_solicitud BIGINT REFERENCES solicitudes_clave_sol(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS clave_sol VARCHAR(120);
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS clave_sol_activa_hasta TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS auditoria (
  id BIGSERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES usuarios(id),
  modulo VARCHAR(30) NOT NULL DEFAULT 'sunat',
  accion VARCHAR(120) NOT NULL,
  entidad VARCHAR(80),
  entidad_id BIGINT,
  detalle JSONB,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Neon puede traer esta secuencia desde la integración anterior. Se usa
   como secuencia PostgreSQL, no como tabla, para evitar conflictos. */
CREATE SEQUENCE IF NOT EXISTS comprobante_seq;

ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(20) NOT NULL DEFAULT 'ninguno';
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS doc_cliente VARCHAR(20);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_clave_sol BIGINT REFERENCES solicitudes_clave_sol(id);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS numero_comprobante VARCHAR(40);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_emisor INTEGER REFERENCES usuarios(id);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS monto NUMERIC(12,2);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha TIMESTAMPTZ;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS asientos JSONB;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='compras_clave_sol_fk' AND conrelid='public.compras_entradas_cine'::regclass) THEN
    ALTER TABLE compras_entradas_cine ADD CONSTRAINT compras_clave_sol_fk FOREIGN KEY(id_clave_sol) REFERENCES solicitudes_clave_sol(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

UPDATE usuarios SET password_hash = contrasena_hash WHERE password_hash IS NULL AND contrasena_hash IS NOT NULL;
UPDATE compras_entradas_cine SET monto = total_venta WHERE monto IS NULL;
UPDATE compras_entradas_cine SET fecha = fecha_registro WHERE fecha IS NULL;
UPDATE compras_entradas_cine SET asientos = asientos_vendidos WHERE asientos IS NULL;

CREATE OR REPLACE FUNCTION sincronizar_comprobante_cinemax() RETURNS trigger AS $$
BEGIN
  NEW.monto := COALESCE(NEW.monto, NEW.total_venta);
  NEW.total_venta := COALESCE(NEW.total_venta, NEW.monto);
  NEW.fecha := COALESCE(NEW.fecha, NEW.fecha_registro, NOW());
  NEW.fecha_registro := COALESCE(NEW.fecha_registro, NEW.fecha, NOW());
  NEW.asientos := COALESCE(NEW.asientos, NEW.asientos_vendidos, '[]'::jsonb);
  NEW.asientos_vendidos := COALESCE(NEW.asientos_vendidos, NEW.asientos, '[]'::jsonb);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sincronizar_comprobante_cinemax ON compras_entradas_cine;
CREATE TRIGGER trg_sincronizar_comprobante_cinemax BEFORE INSERT OR UPDATE ON compras_entradas_cine
FOR EACH ROW EXECUTE FUNCTION sincronizar_comprobante_cinemax();

CREATE OR REPLACE FUNCTION codigo_solicitud_sol() RETURNS trigger AS $$
BEGIN
  IF NEW.codigo_seguimiento IS NULL THEN NEW.codigo_seguimiento := 'SOL-' || TO_CHAR(NOW(),'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 5, '0'); END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_codigo_solicitud_sol ON solicitudes_clave_sol;
CREATE TRIGGER trg_codigo_solicitud_sol BEFORE INSERT ON solicitudes_clave_sol FOR EACH ROW EXECUTE FUNCTION codigo_solicitud_sol();

CREATE INDEX IF NOT EXISTS idx_usuario_rol_modulo ON usuario_rol(modulo, rol);
CREATE INDEX IF NOT EXISTS idx_solicitudes_sol_usuario ON solicitudes_clave_sol(id_usuario, estado);
CREATE INDEX IF NOT EXISTS idx_comprobantes_doc ON compras_entradas_cine(doc_cliente);

INSERT INTO usuario_rol(id_usuario,modulo,rol)
SELECT id,'sunat','administrador' FROM usuarios WHERE LOWER(correo)='admin@cinemax.pe'
ON CONFLICT (id_usuario,modulo) DO UPDATE SET rol=EXCLUDED.rol;
