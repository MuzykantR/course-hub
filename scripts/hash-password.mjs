// Usage: node scripts/hash-password.mjs '<password>'  → prints a bcrypt hash for .env / settings.
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Pass a password of at least 8 characters.');
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
console.log(`Raw hash (Vercel env, SQL):  ${hash}`);
// Next.js expands $VARS inside .env files, so every $ must be escaped there.
console.log(`.env.local line:             TEACHER_PASSWORD_HASH=${hash.replaceAll('$', '\\$')}`);
