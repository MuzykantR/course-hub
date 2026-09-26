'use client';

import { useActionState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { ConfirmForm, FormMessage, SubmitButton } from '@/components/admin/FormBits';
import { Card } from '@/components/ui/Card';
import { initialFormState } from '@/lib/forms';
import { MAX_IMAGES_PER_REPORT } from '@/lib/images';
import { deleteReportAsset, uploadReportAsset } from './actions';

type Asset = { id: number; path: string; mime: string; size: number };

export function AssetManager({ reportId, assets }: { reportId: number; assets: Asset[] }) {
  const [state, action] = useActionState(uploadReportAsset, initialFormState);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">Картинки</h2>
        <p className="text-sm text-theme-secondary">
          PNG, JPEG или WebP до 2 МБ, не больше {MAX_IMAGES_PER_REPORT}. В тексте ссылайтесь по
          имени файла: <code className="font-mono">![подпись](имя.png)</code>
        </p>
      </div>

      {assets.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {assets.map((a) => {
            const name = a.path.split('/').pop()!;
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border-2 border-theme-borderSubtle p-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- private, session-guarded asset */}
                <img
                  src={`/api/assets/${a.path}`}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg border border-theme-borderSubtle object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-semibold">{name}</p>
                  <p className="text-xs text-theme-muted">{Math.round(a.size / 1024)} КБ</p>
                </div>
                <ConfirmForm
                  action={deleteReportAsset}
                  hidden={{ assetId: a.id }}
                  confirm={`Удалить ${name}?`}
                >
                  <button
                    type="submit"
                    aria-label={`Удалить ${name}`}
                    className="rounded-lg p-2 text-rose-700 hover:bg-theme-cardMuted dark:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </ConfirmForm>
              </li>
            );
          })}
        </ul>
      )}

      {assets.length < MAX_IMAGES_PER_REPORT && (
        <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="hidden" name="reportId" value={reportId} />
          <input
            type="file"
            name="file"
            required
            accept="image/png,image/jpeg,image/webp"
            className="text-sm file:mr-3 file:rounded-pill file:border-2 file:border-theme-border file:bg-theme-card file:px-4 file:py-2 file:text-sm file:font-bold"
          />
          <SubmitButton variant="secondary" pendingText="Загружаем…">
            <ImageUp className="h-4 w-4" /> Загрузить
          </SubmitButton>
        </form>
      )}
      <FormMessage state={state} />
    </Card>
  );
}
