// Create or update the settings row (course password) — needed once on a fresh database,
// e.g. the production project, where supabase/seed.sql must NOT be run.
//
//   npx tsx scripts/init-settings.ts '<course password>'
//
// Uses SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local (point them at the target
// project first). Changing the password on an existing row logs every student out.
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import type { Database } from '../lib/db/types.gen';

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 8) {
    console.error("Usage: npx tsx scripts/init-settings.ts '<course password, 8+ chars>'");
    process.exit(1);
  }
  loadEnvConfig(process.cwd());
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  const db = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const hash = await bcrypt.hash(password, 12);
  const { data: existing, error } = await db
    .from('settings')
    .select('pwd_version')
    .eq('id', true)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (existing) {
    const { error: e } = await db
      .from('settings')
      .update({
        course_password_hash: hash,
        pwd_version: existing.pwd_version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true);
    if (e) throw new Error(e.message);
    console.log(`Пароль курса обновлён на ${new URL(SUPABASE_URL).host}; студенты войдут заново.`);
  } else {
    const { error: e } = await db.from('settings').insert({ id: true, course_password_hash: hash });
    if (e) throw new Error(e.message);
    console.log(`Настройки созданы на ${new URL(SUPABASE_URL).host}.`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
