import { useState } from 'react';
import { ExternalLink, Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { getTranslations } from '../i18n/translations';
import {
  deleteConnection,
  simulateIncomingInteraction,
  toggleConnectionStatus,
} from '../services/firestoreService';
import type { ConnectedAccount, FaqRule, Language } from '../types/omnichat';
import { getPlatformName, PlatformIcon } from './PlatformIcon';

interface ConnectionsViewProps {
  uid: string;
  language: Language;
  connections: ConnectedAccount[];
  faqRules: FaqRule[];
  onOpenConnectModal: () => void;
}

export function ConnectionsView({
  uid,
  language,
  connections,
  faqRules,
  onOpenConnectModal,
}: ConnectionsViewProps) {
  const t = getTranslations(language);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  async function handleSimulate(conn: ConnectedAccount) {
    setSimulatingId(conn.id);
    try {
      await simulateIncomingInteraction(uid, conn.channelCategory, [conn], faqRules, language);
    } finally {
      setSimulatingId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
              {t.connections.title}
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
              {t.connections.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="min-h-[44px] px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t.connections.addBtn}</span>
          </button>
        </div>

        {connections.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="font-display text-base font-semibold text-slate-900 mb-1">
              {t.connections.emptyTitle}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              {t.connections.emptyDesc}
            </p>
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="min-h-[44px] px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              {t.connections.addBtn}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                    <PlatformIcon platform={conn.platform} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {conn.username}
                      </h3>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-xs text-slate-600 whitespace-nowrap">
                        {getPlatformName(conn.platform)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>{t.nav[conn.channelCategory]}</span>
                      <span aria-hidden="true">·</span>
                      <span className={conn.status === 'active' ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                        {conn.status === 'active' ? t.connections.active : t.connections.paused}
                      </span>
                      <span aria-hidden="true">·</span>
                      <a
                        href={conn.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-slate-900 truncate max-w-[240px]"
                      >
                        <span className="truncate">{conn.profileUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={simulatingId === conn.id}
                    onClick={() => void handleSimulate(conn)}
                    className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${simulatingId === conn.id ? 'animate-spin' : ''}`} />
                    <span>{t.connections.testSync}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleConnectionStatus(uid, conn)}
                    className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {conn.status === 'active' ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>{t.connections.pause}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>{t.connections.resume}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteConnection(uid, conn.id)}
                    aria-label={t.connections.disconnect}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
