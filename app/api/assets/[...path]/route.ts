import { getSession } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';

const SEGMENT = /^[A-Za-z0-9._-]{1,120}$/;

function notFound() {
  return new Response('Not found', { status: 404 });
}

// Report images from the private bucket. Only paths registered in report_assets are served,
// and only for approved reports (the teacher also sees pending ones for moderation).
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const segments = (await params).path;
  if (
    segments.length < 3 ||
    segments[0] !== 'reports' ||
    !/^[1-9]\d{0,17}$/.test(segments[1]!) ||
    !segments.every((s) => SEGMENT.test(s) && s !== '.' && s !== '..')
  ) {
    return notFound();
  }
  const path = segments.join('/');

  const { data: asset, error } = await db()
    .from('report_assets')
    .select('path, mime, report:reports!inner(id, status)')
    .eq('path', path)
    .eq('report_id', Number(segments[1]))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!asset) return notFound();
  if (asset.report.status !== 'approved' && session.role !== 'teacher') return notFound();

  const { data: file, error: dlError } = await db().storage.from('report-assets').download(path);
  if (dlError || !file) return notFound();

  return new Response(file, {
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
