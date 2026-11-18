import { useState } from 'react';
import { Sparkles, Trash2, Zap } from 'lucide-react';
import { getTranslations } from '../i18n/translations';
import {
  createFaqRule,
  deleteFaqRule,
  toggleFaqRule,
} from '../services/firestoreService';
import type { ChannelCategory, FaqRule, Language } from '../types/omnichat';

interface FaqAutomationViewProps {
  uid: string;
  language: Language;
  rules: FaqRule[];
}

export function FaqAutomationView({ uid, language, rules }: FaqAutomationViewProps) {
  const t = getTranslations(language);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [targetChannel, setTargetChannel] = useState<'all' | ChannelCategory>('all');
  const [replyTemplate, setReplyTemplate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleGenerateWithAi() {
    if (!topic.trim()) return;
    setErrorMsg('');
    setGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), language }),
      });
      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || 'AI generation failed');
      }
      const data = (await response.json()) as {
        title: string;
        keywords: string[];
        replyTemplate: string;
      };
      setTitle(data.title || '');
      setKeywordsText((data.keywords || []).join(', '));
      setReplyTemplate(data.replyTemplate || '');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const keywords = keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      await createFaqRule(uid, {
        title,
        keywords: keywords.length > 0 ? keywords : ['info'],
        replyTemplate,
        targetChannel,
      });
      setTopic('');
      setTitle('');
      setKeywordsText('');
      setReplyTemplate('');
      setTargetChannel('all');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 space-y-10">
        <div className="pb-6 border-b border-slate-200">
          <h1 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            {t.aiRules.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
            {t.aiRules.subtitle}
          </p>
        </div>

        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 mb-4">
            {t.aiRules.newRuleTitle}
          </h2>

          <div className="mb-5 pb-5 border-b border-slate-200">
            <label htmlFor="faq-ai-topic" className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.aiRules.topicLabel}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="faq-ai-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.aiRules.topicPlaceholder}
                className="flex-1 min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <button
                type="button"
                disabled={generating || !topic.trim()}
                onClick={() => void handleGenerateWithAi()}
                className="min-h-[44px] px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? t.aiRules.generating : t.aiRules.generateBtn}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveRule} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="faq-title" className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t.aiRules.ruleTitleLabel}
                </label>
                <input
                  id="faq-title"
                  type="text"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.aiRules.ruleTitlePlaceholder}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="faq-channel" className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t.aiRules.channelLabel}
                </label>
                <select
                  id="faq-channel"
                  value={targetChannel}
                  onChange={(e) => setTargetChannel(e.target.value as 'all' | ChannelCategory)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="all">{t.aiRules.allChannels}</option>
                  <option value="messages">{t.nav.messages}</option>
                  <option value="comments">{t.nav.comments}</option>
                  <option value="emails">{t.nav.emails}</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="faq-keywords" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.aiRules.keywordsLabel}
              </label>
              <input
                id="faq-keywords"
                type="text"
                required
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder={t.aiRules.keywordsPlaceholder}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="faq-template" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.aiRules.templateLabel}
              </label>
              <textarea
                id="faq-template"
                required
                rows={3}
                maxLength={2000}
                value={replyTemplate}
                onChange={(e) => setReplyTemplate(e.target.value)}
                placeholder={t.aiRules.templatePlaceholder}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {t.aiRules.saveRule}
              </button>
            </div>
          </form>
        </section>

        <section>
          {rules.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl">
              <h3 className="font-display text-base font-semibold text-slate-900 mb-1">
                {t.aiRules.emptyTitle}
              </h3>
              <p className="text-sm text-slate-500">{t.aiRules.emptyDesc}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
              {rules.map((rule) => (
                <div key={rule.id} className="py-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                      <h3 className="text-sm font-semibold text-slate-900">{rule.title}</h3>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        {rule.targetChannel === 'all' ? t.aiRules.allChannels : t.nav[rule.targetChannel]}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {rule.triggersCount} {t.aiRules.triggersLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {rule.keywords.join(', ')}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed pt-1">
                      {rule.replyTemplate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void toggleFaqRule(uid, rule)}
                      className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        rule.isActive
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {rule.isActive ? t.aiRules.activeLabel : t.aiRules.pausedLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteFaqRule(uid, rule.id)}
                      aria-label={t.trash.deleteForever}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
