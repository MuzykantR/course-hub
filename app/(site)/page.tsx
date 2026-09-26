import { BookOpen, Code2, Users } from 'lucide-react';
import { requireSession } from '@/lib/auth/guards';

const features = [
  {
    icon: Code2,
    title: 'Задачи и решения',
    text: 'Кто решал у доски, вердикт проверки, код с подсветкой.',
  },
  { icon: BookOpen, title: 'Доклады', text: 'Библиотеки Python от студентов обеих групп.' },
  { icon: Users, title: 'Группы', text: 'Вклад каждого студента в одном месте.' },
];

export default async function Home() {
  await requireSession();

  return (
    <>
      <section className="rounded-card-lg border-2 border-theme-border bg-theme-card p-6 shadow-neo-lg backdrop-blur md:p-10">
        <span className="inline-block rounded-pill border-2 border-theme-border bg-theme-accent px-3 py-1 text-xs font-bold text-theme-accentText">
          Скоро открытие
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          Рабочее пространство курса по Python
        </h1>
        <p className="mt-3 max-w-2xl text-theme-secondary">
          Занятия, задачи с семинаров, решения студентов и доклады по библиотекам — в одной базе
          знаний с поиском и фильтрами.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo backdrop-blur"
          >
            <Icon className="h-6 w-6" />
            <h2 className="mt-3 font-bold">{title}</h2>
            <p className="mt-1 text-sm text-theme-secondary">{text}</p>
          </article>
        ))}
      </section>
    </>
  );
}
