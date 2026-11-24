import React, { useState } from 'react';
import { Users, Globe } from 'lucide-react';
import { ChatType } from '../types/chat';

interface AvatarProps {
  name: string;
  photoURL?: string;
  isOnline?: boolean;
  chatType?: ChatType;
  size?: 'sm' | 'md' | 'lg';
}

const PALETTE = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-sky-600',
  'bg-indigo-600',
  'bg-amber-600',
  'bg-rose-600',
];

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  photoURL,
  isOnline = false,
  chatType = 'direct',
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  const dims =
    size === 'sm'
      ? 'w-9 h-9 text-xs'
      : size === 'lg'
        ? 'w-14 h-14 text-lg'
        : 'w-11 h-11 text-sm';

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';

  return (
    <div className={`relative shrink-0 ${dims}`}>
      {photoURL && !imgError ? (
        <img
          src={photoURL}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full rounded-full object-cover bg-slate-200 dark:bg-slate-700"
        />
      ) : chatType === 'community' ? (
        <div className="w-full h-full rounded-full bg-[#008069] dark:bg-[#00A884] text-white flex items-center justify-center">
          <Globe className="w-5 h-5" />
        </div>
      ) : chatType === 'group' ? (
        <div className="w-full h-full rounded-full bg-slate-600 dark:bg-slate-700 text-white flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
      ) : (
        <div
          className={`w-full h-full rounded-full ${pickColor(name)} text-white font-semibold flex items-center justify-center`}
        >
          {initials}
        </div>
      )}

      {isOnline && chatType === 'direct' && (
        <span
          aria-label="Online"
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25D366] ring-2 ring-white dark:ring-[#111B21]"
        />
      )}
    </div>
  );
};
