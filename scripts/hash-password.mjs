// Usage: node scripts/hash-password.mjs '<password>'  → prints a bcrypt hash for .env / settings.
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Pass a password of at least 8 characters.');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 12));
