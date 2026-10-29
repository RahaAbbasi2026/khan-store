import Link from 'next/link';

export default function Breadcrumb({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="مسیر صفحه" className="text-xs text-ink-soft mb-6">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center gap-2">
            {item.href ? <Link href={item.href} className="hover:text-ruby">{item.name}</Link> : <span aria-current="page">{item.name}</span>}
            {index < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
