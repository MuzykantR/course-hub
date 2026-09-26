import 'server-only';
import { headers } from 'next/headers';

// Vercel sets x-forwarded-for with the real client first; x-real-ip is the fallback.
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || h.get('x-real-ip') || 'unknown';
}
