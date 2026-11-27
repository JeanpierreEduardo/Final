/* ADVERTENCIA: este script elimina únicamente las tablas y objetos del
   proyecto CineMax/SUNAT en el esquema public. Ejecutarlo solo si deseas
   empezar la base desde cero. */
BEGIN;

DROP TABLE IF EXISTS asientos_ventas CASCADE;
DROP TABLE IF EXISTS observaciones CASCADE;
DROP TABLE IF EXISTS auditoria CASCADE;
DROP TABLE IF EXISTS usuario_rol CASCADE;
DROP TABLE IF EXISTS solicitudes_clave_sol CASCADE;
DROP TABLE IF EXISTS sesiones_cinemax CASCADE;
DROP TABLE IF EXISTS compras_entradas_cine CASCADE;
DROP TABLE IF EXISTS peliculas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

DROP FUNCTION IF EXISTS cinemax_en_turno(TIME, TIME, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS proteger_asientos_venta() CASCADE;
DROP FUNCTION IF EXISTS sincronizar_comprobante_cinemax() CASCADE;
DROP FUNCTION IF EXISTS codigo_solicitud_sol() CASCADE;
DROP FUNCTION IF EXISTS cinemax_texto_a_jsonb(TEXT) CASCADE;

COMMIT;

/* comprobante_seq puede existir como SEQUENCE en una BD anterior o como
   TABLE en una instalación antigua. Se elimina de forma compatible. */
DO $$
DECLARE
  objeto REGCLASS := to_regclass('public.comprobante_seq');
  tipo CHAR;
BEGIN
  IF objeto IS NOT NULL THEN
    SELECT relkind INTO tipo FROM pg_class WHERE oid=objeto;
    IF tipo='S' THEN
      EXECUTE 'DROP SEQUENCE public.comprobante_seq CASCADE';
    ELSIF tipo='r' THEN
      EXECUTE 'DROP TABLE public.comprobante_seq CASCADE';
    END IF;
  END IF;
END $$;
