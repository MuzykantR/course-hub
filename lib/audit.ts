import 'server-only';
import { db } from '@/lib/db/client';
import type { Json } from '@/lib/db/types.gen';
import type { Session } from '@/lib/auth/token';

export function actorOf(session: Session | null): string {
  if (!session) return 'anonymous';
  if (session.role === 'teacher') return 'teacher';
  return session.studentId ? `student:${session.studentId}` : 'anonymous';
}

/** Best-effort: an audit failure is logged but never breaks the user's action. */
export async function audit(entry: {
  actor: string;
  action: string;
  entity: string;
  entityId?: string | number | null;
  meta?: Record<string, Json>;
}): Promise<void> {
  const { error } = await db()
    .from('audit_log')
    .insert({
      actor: entry.actor,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId == null ? null : String(entry.entityId),
      meta: entry.meta ?? {},
    });
  if (error) console.error('audit_log insert failed', error.message);
}
