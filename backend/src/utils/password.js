import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function verifyLegacyPbkdf2(password, hash, salt) {
  if (!hash || !salt || !/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{64}$/i.test(hash)) {
    return false;
  }
  const derived = crypto.pbkdf2Sync(
    password,
    Buffer.from(salt, 'hex'),
    180000,
    32,
    'sha256'
  ).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
}

export async function verifyPassword(password, user) {
  if (user?.contrasena_hash?.startsWith('$2')) {
    return { valid: await bcrypt.compare(password, user.contrasena_hash), legacy: false };
  }
  if (verifyLegacyPbkdf2(password, user?.contrasena_hash, user?.salt)) {
    return { valid: true, legacy: true };
  }
  if (typeof user?.contrasena === 'string' && user.contrasena.length > 0) {
    return { valid: user.contrasena === password, legacy: true };
  }
  return { valid: false, legacy: false };
}
