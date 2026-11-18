import { useState } from 'react';

interface AvatarWithFallbackProps {
  src?: string;
  name: string;
  sizeClass?: string;
}

export function AvatarWithFallback({
  src,
  name,
  sizeClass = 'w-10 h-10',
}: AvatarWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  if (!src || failed) {
    return (
      <div
        aria-label={name}
        className={`${sizeClass} rounded-full bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center shrink-0 select-none`}
      >
        {initials || 'U'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover bg-slate-100 shrink-0`}
    />
  );
}
