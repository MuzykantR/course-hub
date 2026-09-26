import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export function SubmissionBlocked({ reason }: { reason: string }) {
  return (
    <Card size="lg" className="flex flex-col items-start gap-3">
      <p className="text-lg font-bold">Сейчас отправить нельзя</p>
      <p className="text-theme-secondary">{reason}</p>
      <Link
        href="/me"
        className="font-semibold underline decoration-theme-accent decoration-2 underline-offset-2"
      >
        Мои заявки →
      </Link>
    </Card>
  );
}
