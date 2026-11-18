import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { getTranslations } from '../i18n/translations';
import {
  incrementFaqRuleTrigger,
  markInteractionRead,
  moveInteractionToTrash,
  sendInteractionReply,
  simulateIncomingInteraction,
  updateInteractionAiAnalysis,
} from '../services/firestoreService';
import type {
  ChannelCategory,
  ConnectedAccount,
  FaqRule,
  InteractionItem,
  Language,
  SentimentType,
} from '../types/omnichat';
import { AvatarWithFallback } from './AvatarWithFallback';
import { getPlatformName, PlatformIcon } from './PlatformIcon';

interface InboxSplitViewProps {
  uid: string;
  language: Language;
  channel: ChannelCategory;
  items: InteractionItem[];
  connections: ConnectedAccount[];
  faqRules: FaqRule[];
  onOpenConnectModal: () => void;
}

function formatTime(createdAt: unknown, lang: Language): string {
  if (!createdAt) return lang === 'en' ? 'Just now' : 'Ahora';
  const maybeTimestamp = createdAt as { toDate?: () => Date };
  const date = typeof maybeTimestamp.toDate === 'function' ? maybeTimestamp.toDate() : new Date();
  return date.toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InboxSplitView({
  uid,
  language,
  channel,
  items,
  connections,
  faqRules,
  onOpenConnectModal,
}: InboxSplitViewProps) {
  const t = getTranslations(language);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [sentimentReason, setSentimentReason] = useState('');
  const [matchedFaqId, setMatchedFaqId] = useState('');
  const [matchedFaqTitle, setMatchedFaqTitle] = useState('');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === 'pending' && item.status !== 'pending') return false;
      if (statusFilter === 'replied' && item.status === 'pending') return false;
      if (!q) return true;
      return (
        item.senderName.toLowerCase().includes(q) ||
        item.senderHandle.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.subjectOrContext.toLowerCase().includes(q) ||
        item.platform.toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, searchQuery]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  );

  useEffect(() => {
    setSelectedId(null);
    setReplyDraft('');
    setAiError('');
    setSentimentReason('');
    setMatchedFaqId('');
    setMatchedFaqTitle('');
  }, [channel]);

  useEffect(() => {
    if (selectedItem) {
      setReplyDraft('');
      setAiError('');
      setSentimentReason('');
      setMatchedFaqId('');
      setMatchedFaqTitle('');
    }
  }, [selectedItem?.id]);

  function handleSelectItem(item: InteractionItem) {
    setSelectedId(item.id);
    if (!item.isRead) {
      void markInteractionRead(uid, channel, item.id);
    }
  }

  async function handleSimulate() {
    setSimulating(true);
    setAiError('');
    try {
      await simulateIncomingInteraction(uid, channel, connections, faqRules, language);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSimulating(false);
    }
  }

  async function handleAnalyzeAi() {
    if (!selectedItem) return;
    setAnalyzingAi(true);
    setAiError('');
    try {
      const activeRules = faqRules
        .filter((r) => r.isActive && (r.targetChannel === 'all' || r.targetChannel === channel))
        .map((r) => ({
          id: r.id,
          title: r.title,
          keywords: r.keywords,
          replyTemplate: r.replyTemplate,
        }));

      const response = await fetch('/api/ai/analyze-and-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: selectedItem.senderName,
          platform: selectedItem.platform,
          channelType: channel,
          subjectOrContext: selectedItem.subjectOrContext,
          body: selectedItem.body,
          language,
          faqRules: activeRules,
        }),
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || 'AI service error');
      }

      const data = (await response.json()) as {
        sentiment: SentimentType;
        sentimentScore: number;
        sentimentReason: string;
        suggestedReply: string;
        matchedFaqId: string;
        matchedFaqTitle: string;
      };

      setSentimentReason(data.sentimentReason || '');
      setMatchedFaqId(data.matchedFaqId || '');
      setMatchedFaqTitle(data.matchedFaqTitle || '');

      await updateInteractionAiAnalysis(uid, channel, selectedItem.id, {
        sentiment: data.sentiment,
        sentimentScore: data.sentimentScore,
        aiSuggestedReply: data.suggestedReply,
      });
    } catch (err: unknown) {
      setAiError(
        `${t.inbox.ai.errorPrefix} ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setAnalyzingAi(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || !replyDraft.trim()) return;
    setSendingReply(true);
    try {
      await sendInteractionReply(uid, channel, selectedItem.id, replyDraft, false);
      setReplyDraft('');
    } finally {
      setSendingReply(false);
    }
  }

  async function handleApplyFaq() {
    if (!selectedItem || !matchedFaqId) return;
    const rule = faqRules.find((r) => r.id === matchedFaqId);
    if (!rule) return;
    setSendingReply(true);
    try {
      await sendInteractionReply(uid, channel, selectedItem.id, rule.replyTemplate, true);
      await incrementFaqRuleTrigger(uid, rule);
      setReplyDraft('');
    } finally {
      setSendingReply(false);
    }
  }

  async function handleTrash() {
    if (!selectedItem) return;
    const itemToTrash = selectedItem;
    setSelectedId(null);
    await moveInteractionToTrash(uid, channel, itemToTrash);
  }

  function getSentimentTextColor(sentiment: SentimentType): string {
    switch (sentiment) {
      case 'positive':
        return 'text-emerald-700';
      case 'urgent':
        return 'text-amber-700';
      case 'negative':
        return 'text-red-700';
      default:
        return 'text-slate-600';
    }
  }

  const matchedLocalFaq = useMemo(() => {
    if (!selectedItem) return null;
    if (matchedFaqId) {
      return faqRules.find((r) => r.id === matchedFaqId) || null;
    }
    const lower = selectedItem.body.toLowerCase();
    return (
      faqRules.find(
        (r) =>
          r.isActive &&
          (r.targetChannel === 'all' || r.targetChannel === channel) &&
          r.keywords.some((kw) => lower.includes(kw.toLowerCase())),
      ) || null
    );
  }, [selectedItem, matchedFaqId, faqRules, channel]);

  return (
    <div className="flex-1 flex min-h-0 bg-white">
      {/* Master List Column */}
      <section
        aria-label={t.nav[channel]}
        className={`${
          selectedItem ? 'hidden lg:flex' : 'flex'
        } w-full lg:w-[360px] xl:w-[390px] flex-col border-r border-slate-200 min-h-0 shrink-0`}
      >
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-lg font-semibold text-slate-900 tracking-tight truncate">
              {t.nav[channel]}
            </h1>
            <button
              type="button"
              disabled={simulating || connections.length === 0}
              onClick={() => void handleSimulate()}
              className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
              <span>{t.inbox.simulateIncoming}</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.filters.searchPlaceholder}
              className="w-full min-h-[40px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'pending', 'replied'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.filters[tab]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-900 mb-1">
                {t.inbox.emptyTitle}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                {t.inbox.emptyDesc}
              </p>
              <button
                type="button"
                onClick={onOpenConnectModal}
                className="min-h-[40px] px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.inbox.connectBtn}</span>
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left px-4 py-3.5 transition-colors flex items-start gap-3 min-h-[68px] ${
                    isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <AvatarWithFallback src={item.senderAvatar} name={item.senderName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm truncate ${
                          item.isRead ? 'font-medium text-slate-800' : 'font-semibold text-slate-950'
                        }`}
                      >
                        {item.senderName}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                        {formatTime(item.createdAt, language)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                      <span>{getPlatformName(item.platform)}</span>
                      <span aria-hidden="true">·</span>
                      <span className={getSentimentTextColor(item.sentiment)}>
                        {t.inbox.sentiment[item.sentiment]}
                      </span>
                      {!item.isRead && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-600 font-medium">{t.inbox.unread}</span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Detail & AI Reply Studio */}
      <section
        className={`${
          selectedItem ? 'flex' : 'hidden lg:flex'
        } flex-1 flex-col min-w-0 min-h-0 bg-slate-50/60`}
      >
        {!selectedItem ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="font-display text-base font-semibold text-slate-900 mb-1.5">
              {t.inbox.selectItem}
            </h2>
            <p className="text-sm text-slate-500 max-w-md leading-relaxed">
              {t.inbox.selectItemDesc}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Detail Header */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label={t.common.back}
                  className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <AvatarWithFallback src={selectedItem.senderAvatar} name={selectedItem.senderName} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 truncate">
                      {selectedItem.senderName}
                    </h2>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500 truncate">
                      {selectedItem.senderHandle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                    <PlatformIcon platform={selectedItem.platform} className="w-3.5 h-3.5 shrink-0" />
                    <span>{getPlatformName(selectedItem.platform)}</span>
                    {selectedItem.subjectOrContext && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{selectedItem.subjectOrContext}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleTrash()}
                className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.inbox.moveToTrash}</span>
              </button>
            </header>

            {/* Conversation Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Incoming Message */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>{t.inbox.sentiment.label}:</span>
                    <span className={`font-semibold ${getSentimentTextColor(selectedItem.sentiment)}`}>
                      {t.inbox.sentiment[selectedItem.sentiment]}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      ({selectedItem.sentimentScore}/100)
                    </span>
                  </div>
                  <span className="font-mono tabular-nums">
                    {formatTime(selectedItem.createdAt, language)}
                  </span>
                </div>

                <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.body}
                </p>

                {sentimentReason && (
                  <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
                    {sentimentReason}
                  </p>
                )}
              </div>

              {/* Already Replied View */}
              {selectedItem.replyText && (
                <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      {selectedItem.status === 'auto_replied'
                        ? t.inbox.autoReplied
                        : t.inbox.yourReply}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedItem.replyText}
                  </p>
                </div>
              )}

              {/* AI Assistant Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t.inbox.ai.panelTitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={analyzingAi}
                    onClick={() => void handleAnalyzeAi()}
                    className="min-h-[40px] px-3.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{analyzingAi ? t.inbox.ai.analyzing : t.inbox.ai.analyzeBtn}</span>
                  </button>
                </div>

                {aiError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {aiError}
                  </p>
                )}

                {selectedItem.aiSuggestedReply && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {selectedItem.aiSuggestedReply}
                    </p>
                    <button
                      type="button"
                      onClick={() => setReplyDraft(selectedItem.aiSuggestedReply)}
                      className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {t.inbox.ai.useSuggestion}
                    </button>
                  </div>
                )}

                {matchedLocalFaq && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        {t.inbox.ai.faqMatch}:{' '}
                        <strong className="text-slate-900">
                          {matchedFaqTitle || matchedLocalFaq.title}
                        </strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={sendingReply}
                      onClick={() => void handleApplyFaq()}
                      className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {t.inbox.ai.applyFaq}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Reply Composer */}
            <form
              onSubmit={handleSendReply}
              className="bg-white border-t border-slate-200 p-4 sm:px-6 shrink-0"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  rows={2}
                  maxLength={4000}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder={t.inbox.replyPlaceholder}
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 resize-none"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyDraft.trim()}
                  className="min-h-[44px] px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50 self-end sm:self-stretch"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingReply ? t.inbox.sending : t.inbox.sendReply}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
