import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const users = [
  { nombre: 'Administrador CineMax', correo: 'admin@cinemax.pe', password: 'Admin123*', rol: 'administrador' },
  { nombre: 'Empleado CineMax', correo: 'empleado@cinemax.pe', password: 'Empleado123*', rol: 'empleado', turno_nombre: 'Turno completo', turno_inicio: '00:00', turno_fin: '23:59' },
  { nombre: 'Cliente CineMax', correo: 'cliente@cinemax.pe', dni: '70000001', password: 'Cliente123*', rol: 'usuario' }
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en backend/.env');
  await pool.query(await readFile(path.join(here, 'schema.sql'), 'utf8'));
  await pool.query(await readFile(path.join(here, 'integracion_sunat.sql'), 'utf8'));
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 12);
    const existing = await pool.query('SELECT id FROM usuarios WHERE LOWER(correo)=LOWER($1) LIMIT 1', [user.correo]);
    if (existing.rows[0]) {
      await pool.query(
        `UPDATE usuarios SET nombre=$1,correo=$2,dni=$3,contrasena_hash=$4,contrasena=NULL,salt=NULL,
         activo=TRUE,rol=$5,turno_nombre=$6,turno_inicio=$7,turno_fin=$8 WHERE id=$9`,
        [user.nombre, user.correo, user.dni || null, hash, user.rol, user.turno_nombre || null, user.turno_inicio || null, user.turno_fin || null, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO usuarios(nombre,correo,dni,contrasena_hash,contrasena,salt,activo,rol,turno_nombre,turno_inicio,turno_fin)
         VALUES($1,$2,$3,$4,NULL,NULL,TRUE,$5,$6,$7,$8)`,
        [user.nombre, user.correo, user.dni || null, hash, user.rol, user.turno_nombre || null, user.turno_inicio || null, user.turno_fin || null]
      );
    }
  }
  const seeded = await pool.query("SELECT id, correo FROM usuarios WHERE LOWER(correo) IN ('admin@cinemax.pe','empleado@cinemax.pe','cliente@cinemax.pe')");
  for (const user of seeded.rows) {
    const rol = user.correo === 'admin@cinemax.pe' ? 'administrador' : user.correo === 'empleado@cinemax.pe' ? 'empleado' : 'cliente';
    await pool.query("INSERT INTO usuario_rol(id_usuario,modulo,rol) VALUES($1,'cinemax',$2) ON CONFLICT (id_usuario,modulo) DO UPDATE SET rol=EXCLUDED.rol", [user.id, rol]);
    await pool.query("INSERT INTO usuario_rol(id_usuario,modulo,rol) VALUES($1,'sunat',$2) ON CONFLICT (id_usuario,modulo) DO UPDATE SET rol=EXCLUDED.rol", [user.id, user.correo === 'admin@cinemax.pe' ? 'administrador' : 'cliente']);
  }
  console.log('Base de datos inicializada.');
  console.log('Administrador: admin@cinemax.pe / Admin123*');
  console.log('Empleado: empleado@cinemax.pe / Empleado123*');
  console.log('Cliente: cliente@cinemax.pe / Cliente123*');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => pool.end());
