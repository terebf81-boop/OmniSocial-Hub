import { useState } from 'react';
import { X } from 'lucide-react';
import { getTranslations } from '../i18n/translations';
import { connectAccountByUrl } from '../services/firestoreService';
import type { ChannelCategory, Language } from '../types/omnichat';

interface ConnectAccountModalProps {
  uid: string;
  language: Language;
  defaultChannel?: ChannelCategory;
  onClose: () => void;
}

export function ConnectAccountModal({
  uid,
  language,
  defaultChannel = 'messages',
  onClose,
}: ConnectAccountModalProps) {
  const t = getTranslations(language);
  const [profileUrl, setProfileUrl] = useState('');
  const [username, setUsername] = useState('');
  const [channelCategory, setChannelCategory] = useState<ChannelCategory>(defaultChannel);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await connectAccountByUrl(uid, {
        profileUrl,
        username,
        channelCategory,
        language,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 id="connect-modal-title" className="font-display text-lg font-semibold text-slate-900">
            {t.connections.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.connections.cancel}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {t.connections.modalDesc}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="conn-url" className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.connections.urlLabel}
            </label>
            <input
              id="conn-url"
              type="text"
              required
              maxLength={500}
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder={t.connections.urlPlaceholder}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label htmlFor="conn-user" className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.connections.usernameLabel}
            </label>
            <input
              id="conn-user"
              type="text"
              required
              maxLength={100}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.connections.usernamePlaceholder}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.connections.channelLabel}
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              {(['messages', 'comments', 'emails'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setChannelCategory(cat)}
                  className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    channelCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.nav[cat]}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {t.connections.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {submitting ? t.connections.connecting : t.connections.connectSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
