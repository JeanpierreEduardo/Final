/* Compatibilidad con el backend SUNAT del compañero. Ejecutar después de
   integracion_sunat.sql y antes de cargar datos de prueba de SUNAT. */
BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_nombre TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_inicio TIME;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_fin TIME;

ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS descripcion VARCHAR(2000) NOT NULL DEFAULT '';

DO $$
BEGIN
  ALTER TABLE solicitudes_clave_sol DROP CONSTRAINT IF EXISTS solicitudes_clave_sol_estado_check;
  ALTER TABLE solicitudes_clave_sol ADD CONSTRAINT solicitudes_clave_sol_estado_check
    CHECK (estado IN ('pendiente','registrado','en proceso','aprobada','rechazado')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE observaciones ADD COLUMN IF NOT EXISTS id_clave_sol BIGINT;
ALTER TABLE observaciones ADD COLUMN IF NOT EXISTS detalle TEXT;
UPDATE observaciones SET id_clave_sol=id_solicitud WHERE id_clave_sol IS NULL AND id_solicitud IS NOT NULL;
UPDATE observaciones SET detalle=texto WHERE detalle IS NULL AND texto IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='observaciones_clave_sol_fk' AND conrelid='public.observaciones'::regclass) THEN
    ALTER TABLE observaciones ADD CONSTRAINT observaciones_clave_sol_fk FOREIGN KEY(id_clave_sol) REFERENCES solicitudes_clave_sol(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS integracion_tokens (
  jti UUID PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id),
  id_clave_sol BIGINT NOT NULL REFERENCES solicitudes_clave_sol(id),
  expira_en TIMESTAMPTZ NOT NULL,
  revocado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultas_atencion (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id),
  asunto TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  respuesta TEXT,
  respondido_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respondido_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS recursos_publicos (
  slug TEXT PRIMARY KEY,
  storage_key TEXT NOT NULL,
  alt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sol_usuario_estado ON solicitudes_clave_sol(id_usuario,estado) WHERE eliminado=FALSE;
CREATE INDEX IF NOT EXISTS compras_sol ON compras_entradas_cine(id_clave_sol);
CREATE INDEX IF NOT EXISTS observaciones_sol ON observaciones(id_clave_sol);

UPDATE usuarios
SET turno_nombre='Completo',turno_inicio='00:00',turno_fin='23:59'
WHERE id IN (SELECT id_usuario FROM usuario_rol WHERE modulo='sunat' AND rol='empleado')
  AND turno_inicio IS NULL;

COMMIT;
