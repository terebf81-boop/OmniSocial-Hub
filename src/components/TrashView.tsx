import { RotateCcw, Trash2 } from 'lucide-react';
import { getTranslations } from '../i18n/translations';
import {
  permanentlyDeleteFromTrash,
  restoreFromTrash,
} from '../services/firestoreService';
import type { Language, TrashItem } from '../types/omnichat';
import { AvatarWithFallback } from './AvatarWithFallback';
import { getPlatformName } from './PlatformIcon';

interface TrashViewProps {
  uid: string;
  language: Language;
  items: TrashItem[];
}

function getDaysRemaining(purgeAtMs: number): number {
  const diff = purgeAtMs - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function TrashView({ uid, language, items }: TrashViewProps) {
  const t = getTranslations(language);

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="pb-6 border-b border-slate-200">
          <h1 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            {t.trash.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            {t.trash.subtitle}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="font-display text-base font-semibold text-slate-900 mb-1">
              {t.trash.emptyTitle}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {t.trash.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {items.map((item) => {
              const daysLeft = getDaysRemaining(item.purgeAtMs);
              return (
                <div
                  key={item.id}
                  className="py-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <AvatarWithFallback src={item.senderAvatar} name={item.senderName} />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="text-sm font-semibold text-slate-900">
                          {item.senderName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{getPlatformName(item.platform)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {t.trash.originalFrom}: {t.nav[item.originalCollection]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-amber-700">
                          {daysLeft} {t.trash.daysLeft}
                        </span>
                      </div>
                      {item.subjectOrContext && (
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {item.subjectOrContext}
                        </p>
                      )}
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void restoreFromTrash(uid, item)}
                      className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.trash.restore}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void permanentlyDeleteFromTrash(uid, item.id)}
                      className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.trash.deleteForever}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
