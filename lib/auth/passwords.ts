import 'server-only';
import bcrypt from 'bcryptjs';

const PIN_ROUNDS = 10;

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, PIN_ROUNDS);
}
