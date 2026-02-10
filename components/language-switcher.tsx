'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

interface LanguageSwitcherProps {
  locale: string;
  className?: string;
  style?: React.CSSProperties;
}

export function LanguageSwitcher({locale, className, style}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const other = locale === 'ja' ? 'en' : 'ja';

  const nextPath = pathname.replace(/^\/(ja|en)(?=\/|$)/, `/${other}`);

  return (
    <Link 
      href={nextPath}
      className={className || "text-xs font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors"}
      style={style}
    >
      {other.toUpperCase()}
    </Link>
  );
}
