/* CineMax — esquema único para PostgreSQL/Neon.
   No elimina tablas ni registros existentes. Es seguro ejecutarlo más de una vez. */

BEGIN;
SET TIME ZONE 'America/Lima';

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(160) NOT NULL UNIQUE,
  dni VARCHAR(8),
  contrasena_hash TEXT,
  contrasena TEXT,
  salt TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  rol VARCHAR(20) NOT NULL DEFAULT 'usuario',
  turno_nombre VARCHAR(60),
  turno_inicio TIME,
  turno_fin TIME,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena_hash TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni VARCHAR(8);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS salt TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'usuario';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_nombre VARCHAR(60);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_inicio TIME;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_fin TIME;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  ALTER TABLE usuarios ALTER COLUMN contrasena DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_lower_uq ON usuarios (LOWER(correo));
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_dni_uq ON usuarios(dni) WHERE dni IS NOT NULL;

CREATE TABLE IF NOT EXISTS sesiones_cinemax (
  token_hash CHAR(64) PRIMARY KEY,
  id_usuario INTEGER NOT NULL,
  expira TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiones_expira_idx ON sesiones_cinemax(expira);

CREATE TABLE IF NOT EXISTS peliculas (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(80) NOT NULL,
  titulo VARCHAR(140) NOT NULL,
  genero VARCHAR(80) NOT NULL,
  duracion INTEGER NOT NULL DEFAULT 90,
  clasificacion VARCHAR(30) NOT NULL DEFAULT 'Todo público',
  sala VARCHAR(30) NOT NULL DEFAULT 'Sala 1',
  sinopsis VARCHAR(2000) NOT NULL DEFAULT '',
  poster VARCHAR(240) NOT NULL DEFAULT 'im2.jpg',
  estado VARCHAR(20) NOT NULL DEFAULT 'cartelera',
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS clave VARCHAR(80);
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS titulo VARCHAR(140);
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS genero VARCHAR(80);
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS duracion INTEGER DEFAULT 90;
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS clasificacion VARCHAR(30) DEFAULT 'Todo público';
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS sala VARCHAR(30) DEFAULT 'Sala 1';
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS sinopsis VARCHAR(2000) DEFAULT '';
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS poster VARCHAR(240) DEFAULT 'im2.jpg';
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'cartelera';
ALTER TABLE peliculas ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ DEFAULT NOW();
UPDATE peliculas SET clave='legacy-'||id::TEXT WHERE clave IS NULL OR trim(clave)='';
UPDATE peliculas SET estado='cartelera' WHERE estado IS NULL;
UPDATE peliculas SET poster='im2.jpg' WHERE poster IS NULL OR trim(poster)='';
CREATE UNIQUE INDEX IF NOT EXISTS peliculas_clave_uq ON peliculas(clave);

CREATE TABLE IF NOT EXISTS compras_entradas_cine (
  id SERIAL PRIMARY KEY,
  codigo_seguimiento VARCHAR(80) NOT NULL,
  id_usuario INTEGER,
  usuario_id INTEGER,
  nombre_cliente VARCHAR(120),
  correo_cliente VARCHAR(160),
  pelicula VARCHAR(140),
  pelicula_id INTEGER,
  funcion_horario VARCHAR(30),
  sala VARCHAR(30),
  fecha_funcion DATE,
  cantidad INTEGER NOT NULL DEFAULT 1,
  comentario VARCHAR(500) NOT NULL DEFAULT '',
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 18,
  total_venta NUMERIC(10,2) NOT NULL DEFAULT 18,
  asientos_vendidos JSONB NOT NULL DEFAULT '[]'::JSONB,
  estado VARCHAR(30) NOT NULL DEFAULT 'registrado',
  id_empleado INTEGER,
  id_validador INTEGER,
  fecha_validacion TIMESTAMPTZ,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_usuario INTEGER;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS pelicula_id INTEGER;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS correo_cliente VARCHAR(160);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_funcion DATE;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS comentario VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 18;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS total_venta NUMERIC(10,2) NOT NULL DEFAULT 18;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS asientos_vendidos JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'registrado';
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_empleado INTEGER;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_validador INTEGER;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_validacion TIMESTAMPTZ;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(20);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS numero_comprobante VARCHAR(40);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS ruc_cliente VARCHAR(11);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS razon_social VARCHAR(180);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS tarjeta_ultimos4 CHAR(4);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_clave_sol BIGINT;

UPDATE compras_entradas_cine SET id_usuario=usuario_id WHERE id_usuario IS NULL AND usuario_id IS NOT NULL;
UPDATE compras_entradas_cine SET cantidad=1 WHERE cantidad IS NULL OR cantidad<1;
UPDATE compras_entradas_cine SET comentario='' WHERE comentario IS NULL;
UPDATE compras_entradas_cine SET precio_unitario=18 WHERE precio_unitario IS NULL;
UPDATE compras_entradas_cine SET total_venta=precio_unitario*cantidad WHERE total_venta IS NULL;
UPDATE compras_entradas_cine SET estado='registrado' WHERE estado IS NULL;
UPDATE compras_entradas_cine SET estado_pago='pagado' WHERE estado='atendido' AND estado_pago='pendiente';

CREATE UNIQUE INDEX IF NOT EXISTS compras_codigo_uq ON compras_entradas_cine(codigo_seguimiento);
CREATE INDEX IF NOT EXISTS compras_usuario_fecha_idx ON compras_entradas_cine(id_usuario,fecha_registro DESC);
CREATE INDEX IF NOT EXISTS compras_pelicula_idx ON compras_entradas_cine(pelicula_id);
CREATE INDEX IF NOT EXISTS compras_empleado_fecha_idx ON compras_entradas_cine(id_empleado,fecha_registro DESC);
CREATE INDEX IF NOT EXISTS usuarios_dni_idx ON usuarios(dni);
CREATE INDEX IF NOT EXISTS compras_cin_idx ON compras_entradas_cine(codigo_seguimiento);

UPDATE compras_entradas_cine c SET pelicula_id=p.id
FROM peliculas p
WHERE c.pelicula_id IS NULL AND c.pelicula IS NOT NULL AND lower(trim(c.pelicula))=lower(trim(p.titulo));

CREATE TABLE IF NOT EXISTS asientos_ventas (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER NOT NULL,
  sala VARCHAR(30) NOT NULL,
  fecha_funcion DATE NOT NULL,
  horario VARCHAR(30) NOT NULL,
  asiento VARCHAR(3) NOT NULL,
  CONSTRAINT asiento_funcion_uq UNIQUE(sala,fecha_funcion,horario,asiento),
  CONSTRAINT asiento_compra_uq UNIQUE(compra_id,asiento)
);
CREATE INDEX IF NOT EXISTS asientos_compra_idx ON asientos_ventas(compra_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sesiones_usuario_fk' AND conrelid='public.sesiones_cinemax'::regclass) THEN
    ALTER TABLE sesiones_cinemax ADD CONSTRAINT sesiones_usuario_fk FOREIGN KEY(id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='compras_usuario_fk' AND conrelid='public.compras_entradas_cine'::regclass) THEN
    ALTER TABLE compras_entradas_cine ADD CONSTRAINT compras_usuario_fk FOREIGN KEY(id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='compras_pelicula_fk' AND conrelid='public.compras_entradas_cine'::regclass) THEN
    ALTER TABLE compras_entradas_cine ADD CONSTRAINT compras_pelicula_fk FOREIGN KEY(pelicula_id) REFERENCES peliculas(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='compras_empleado_fk' AND conrelid='public.compras_entradas_cine'::regclass) THEN
    ALTER TABLE compras_entradas_cine ADD CONSTRAINT compras_empleado_fk FOREIGN KEY(id_empleado) REFERENCES usuarios(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='compras_validador_fk' AND conrelid='public.compras_entradas_cine'::regclass) THEN
    ALTER TABLE compras_entradas_cine ADD CONSTRAINT compras_validador_fk FOREIGN KEY(id_validador) REFERENCES usuarios(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='asientos_compra_fk' AND conrelid='public.asientos_ventas'::regclass) THEN
    ALTER TABLE asientos_ventas ADD CONSTRAINT asientos_compra_fk FOREIGN KEY(compra_id) REFERENCES compras_entradas_cine(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='usuarios_rol_ck' AND conrelid='public.usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_ck CHECK(rol IN ('usuario','administrador','empleado')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='usuarios_turno_ck' AND conrelid='public.usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_turno_ck CHECK(
      (turno_nombre IS NULL AND turno_inicio IS NULL AND turno_fin IS NULL)
      OR (turno_nombre IS NOT NULL AND turno_inicio IS NOT NULL AND turno_fin IS NOT NULL AND turno_inicio<>turno_fin)
    ) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION cinemax_en_turno(inicio TIME, fin TIME, instante TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT CASE
    WHEN inicio < fin THEN (instante AT TIME ZONE 'America/Lima')::TIME >= inicio AND (instante AT TIME ZONE 'America/Lima')::TIME < fin
    WHEN inicio > fin THEN (instante AT TIME ZONE 'America/Lima')::TIME >= inicio OR (instante AT TIME ZONE 'America/Lima')::TIME < fin
    ELSE FALSE
  END;
$$;

CREATE OR REPLACE FUNCTION proteger_asientos_venta() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.id_empleado IS NOT NULL
     AND EXISTS (SELECT 1 FROM asientos_ventas WHERE compra_id=OLD.id)
     AND (NEW.pelicula_id IS DISTINCT FROM OLD.pelicula_id
       OR NEW.sala IS DISTINCT FROM OLD.sala
       OR NEW.fecha_funcion IS DISTINCT FROM OLD.fecha_funcion
       OR NEW.funcion_horario IS DISTINCT FROM OLD.funcion_horario
       OR NEW.cantidad IS DISTINCT FROM OLD.cantidad) THEN
    RAISE EXCEPTION 'Esta venta tiene asientos asignados. Conserva película, sala, función y cantidad, o cancélala y crea otra.';
  END IF;
  IF TG_OP='UPDATE' AND NEW.estado='cancelado' THEN
    DELETE FROM asientos_ventas WHERE compra_id=OLD.id;
  END IF;
  IF TG_OP='UPDATE' AND OLD.id_empleado IS NOT NULL AND OLD.estado='cancelado' AND NEW.estado<>'cancelado' THEN
    RAISE EXCEPTION 'Una venta cancelada no puede reactivarse.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS proteger_asientos_venta_trigger ON compras_entradas_cine;
CREATE TRIGGER proteger_asientos_venta_trigger BEFORE UPDATE ON compras_entradas_cine FOR EACH ROW EXECUTE FUNCTION proteger_asientos_venta();

INSERT INTO peliculas(clave,titulo,genero,duracion,clasificacion,sala,sinopsis,poster,estado) VALUES
('silencio','El Origen del Silencio','Suspenso',118,'+14','Sala 1','','dark_matter.jpg','cartelera'),
('ruta65','Ruta 65','Acción',132,'+14','Sala 2','','tormento.jpg','cartelera'),
('carton','Mundo de Cartón','Animación',95,'Todo público','Sala 3','','mundo_de_carton.jpg','cartelera'),
('luna','Bajo la Misma Luna','Drama',110,'+14','Sala 4','','under_the_moon.jpg','cartelera'),
('ventana','A través de mi ventana','Romance',118,'+14','Sala 1','','a_travez_de_mi_ventana.jpg','proximamente'),
('dos-caras','A 2 caras','Suspenso',132,'+14','Sala 2','','65.jpg','proximamente'),
('wish','Wish','Animación',95,'Todo público','Sala 3','','wish.jpg','proximamente'),
('no-respires','No respires','Terror',110,'+18','Sala 4','','destino.jpg','proximamente')
ON CONFLICT(clave) DO UPDATE SET titulo=EXCLUDED.titulo,genero=EXCLUDED.genero,duracion=EXCLUDED.duracion,clasificacion=EXCLUDED.clasificacion,sala=EXCLUDED.sala,poster=EXCLUDED.poster,estado=EXCLUDED.estado;

COMMIT;
