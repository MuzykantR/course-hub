const RU: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

/** "Анна Иванова" → "anna-ivanova"; "NumPy: массивы" → "numpy-massivy". */
export function slugify(text: string, maxLength = 60): string {
  const latin = [...text.toLowerCase()].map((ch) => RU[ch] ?? ch).join('');
  return latin
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** First free variant: base, base-2, base-3… */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = base || 'item';
  if (!used.has(root)) return root;
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Report slug from library + title, without repeating the library ("seaborn: …" → "seaborn-…"). */
export function reportSlugBase(library: string, title: string): string {
  const lib = slugify(library, 30);
  const t = slugify(title, 80);
  const combined = !lib || t === lib || t.startsWith(`${lib}-`) ? t : slugify(`${library} ${title}`, 80);
  return combined || 'report';
}
