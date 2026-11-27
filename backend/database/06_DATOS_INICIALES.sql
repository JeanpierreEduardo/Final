/* Ejecutar al final, después de 05_COMPATIBILIDAD_SUNAT_COMPANERO.sql. */
BEGIN;

INSERT INTO usuarios(nombre,correo,dni,contrasena_hash,contrasena,salt,activo,rol,turno_nombre,turno_inicio,turno_fin)
VALUES
('Administrador CineMax','admin@cinemax.pe',NULL,'$2a$12$cIUQk7Qzt87YuOgXrePqnuTuS23qeV5LNBAl5NJIyHpU93wNfGvHW',NULL,NULL,TRUE,'administrador',NULL,NULL,NULL),
('Empleado CineMax','empleado@cinemax.pe',NULL,'$2a$12$xeNoPBhwAbp/YJUxrbQpsODCr.kvHeSDJn/vwy5dD6GGZ9g5UyCAu',NULL,NULL,TRUE,'empleado','Turno completo','00:00','23:59'),
('Cliente CineMax','cliente@cinemax.pe','70000001','$2a$12$0XOg6evbx47.DQzK.XP21eLoqVB.rQkkZt/b25zR3MSKg.HGa9OGS',NULL,NULL,TRUE,'usuario',NULL,NULL,NULL)
ON CONFLICT (correo) DO UPDATE SET nombre=EXCLUDED.nombre,dni=EXCLUDED.dni,contrasena_hash=EXCLUDED.contrasena_hash,activo=TRUE,rol=EXCLUDED.rol,turno_nombre=EXCLUDED.turno_nombre,turno_inicio=EXCLUDED.turno_inicio,turno_fin=EXCLUDED.turno_fin;

INSERT INTO usuario_rol(id_usuario,modulo,rol)
SELECT id,'cinemax',CASE WHEN rol='administrador' THEN 'administrador' WHEN rol='empleado' THEN 'empleado' ELSE 'cliente' END
FROM usuarios WHERE correo IN ('admin@cinemax.pe','empleado@cinemax.pe','cliente@cinemax.pe')
ON CONFLICT (id_usuario,modulo) DO UPDATE SET rol=EXCLUDED.rol;

INSERT INTO usuario_rol(id_usuario,modulo,rol)
SELECT id,'sunat',CASE WHEN rol='administrador' THEN 'administrador' ELSE 'cliente' END
FROM usuarios WHERE correo IN ('admin@cinemax.pe','empleado@cinemax.pe','cliente@cinemax.pe')
ON CONFLICT (id_usuario,modulo) DO UPDATE SET rol=EXCLUDED.rol;

COMMIT;
