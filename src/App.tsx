import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  Link2,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import { auth } from './firebase/config';
import { getTranslations } from './i18n/translations';
import {
  ensureUserProfile,
  seedStarterWorkspaceIfEmpty,
  subscribeChannel,
  subscribeConnections,
  subscribeFaqRules,
  subscribeTrash,
  updateUserLanguage,
} from './services/firestoreService';
import type {
  ConnectedAccount,
  FaqRule,
  InteractionItem,
  Language,
  TrashItem,
  WorkspaceSection,
} from './types/omnichat';
import { AuthScreen } from './components/AuthScreen';
import { ConnectAccountModal } from './components/ConnectAccountModal';
import { ConnectionsView } from './components/ConnectionsView';
import { FaqAutomationView } from './components/FaqAutomationView';
import { InboxSplitView } from './components/InboxSplitView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { TrashView } from './components/TrashView';
import { useOnlineStatus } from './hooks/usePWAInstall';

export default function App() {
  const isOnline = useOnlineStatus();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('es');
  const [section, setSection] = useState<WorkspaceSection>('messages');
  const [showConnectModal, setShowConnectModal] = useState(false);

  const [connections, setConnections] = useState<ConnectedAccount[]>([]);
  const [messages, setMessages] = useState<InteractionItem[]>([]);
  const [comments, setComments] = useState<InteractionItem[]>([]);
  const [emails, setEmails] = useState<InteractionItem[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [faqRules, setFaqRules] = useState<FaqRule[]>([]);

  const t = getTranslations(language);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const isVerifiedSession = Boolean(user && user.emailVerified);

  useEffect(() => {
    if (!user || !isVerifiedSession) {
      setConnections([]);
      setMessages([]);
      setComments([]);
      setEmails([]);
      setTrash([]);
      setFaqRules([]);
      return;
    }

    let active = true;
    const uid = user.uid;

    void (async () => {
      const profile = await ensureUserProfile(user, language);
      if (active && (profile.language === 'es' || profile.language === 'en')) {
        setLanguage(profile.language);
      }
      await seedStarterWorkspaceIfEmpty(uid, profile.language || language);
    })();

    const unsubConnections = subscribeConnections(uid, setConnections);
    const unsubMessages = subscribeChannel(uid, 'messages', setMessages);
    const unsubComments = subscribeChannel(uid, 'comments', setComments);
    const unsubEmails = subscribeChannel(uid, 'emails', setEmails);
    const unsubTrash = subscribeTrash(uid, setTrash);
    const unsubRules = subscribeFaqRules(uid, setFaqRules);

    return () => {
      active = false;
      unsubConnections();
      unsubMessages();
      unsubComments();
      unsubEmails();
      unsubTrash();
      unsubRules();
    };
  }, [user?.uid, isVerifiedSession]);

  async function handleLanguageChange(nextLang: Language) {
    setLanguage(nextLang);
    if (user && isVerifiedSession) {
      await updateUserLanguage(user.uid, nextLang);
    }
  }

  async function handleRefreshVerified() {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    setUser(auth.currentUser ? ({ ...auth.currentUser } as User) : null);
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isVerifiedSession) {
    return (
      <AuthScreen
        language={language}
        onLanguageChange={(lang) => void handleLanguageChange(lang)}
        unverifiedUser={user && !user.emailVerified ? user : null}
        onVerifiedRefresh={handleRefreshVerified}
      />
    );
  }

  const unreadMessages = messages.filter((m) => !m.isRead).length;
  const unreadComments = comments.filter((c) => !c.isRead).length;
  const unreadEmails = emails.filter((e) => !e.isRead).length;

  const primarySections: Array<{
    id: WorkspaceSection;
    label: string;
    icon: typeof MessageSquare;
    count?: number;
  }> = [
    { id: 'messages', label: t.nav.messages, icon: MessageSquare, count: unreadMessages },
    { id: 'comments', label: t.nav.comments, icon: MessageCircle, count: unreadComments },
    { id: 'emails', label: t.nav.emails, icon: Mail, count: unreadEmails },
  ];

  const utilitySections: Array<{
    id: WorkspaceSection;
    label: string;
    icon: typeof Link2;
    count?: number;
  }> = [
    { id: 'connections', label: t.nav.connections, icon: Link2, count: connections.length },
    { id: 'ai_rules', label: t.nav.aiRules, icon: Zap },
    { id: 'trash', label: t.nav.trash, icon: Trash2, count: trash.length },
  ];

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar (240px) */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="px-5 py-5 border-b border-slate-200 flex items-center justify-between gap-2">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            {t.brand}
          </span>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="w-full min-h-[40px] px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.inbox.connectBtn}</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            {primarySections.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-slate-100 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-1">
            {utilitySections.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-slate-100 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-xs font-mono tabular-nums text-slate-400">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <PWAInstallButton language={language} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">{t.common.languageLabel}</span>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => void handleLanguageChange('es')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                  language === 'es' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => void handleLanguageChange('en')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">
                {user.displayName || user.email}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{t.common.synced}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              aria-label={t.auth.signOut}
              title={t.auth.signOut}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Header (<= 52px) */}
      <header className="lg:hidden h-13 px-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <span className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
          {t.brand}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <PWAInstallButton language={language} compact />
          <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => void handleLanguageChange('es')}
              className={`px-1.5 py-1 text-[11px] font-medium rounded ${
                language === 'es' ? 'bg-white text-slate-900' : 'text-slate-500'
              }`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => void handleLanguageChange('en')}
              className={`px-1.5 py-1 text-[11px] font-medium rounded ${
                language === 'en' ? 'bg-white text-slate-900' : 'text-slate-500'
              }`}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            aria-label={t.inbox.connectBtn}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center bg-slate-900 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            aria-label={t.auth.signOut}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {!isOnline && (
        <div
          role="status"
          className="lg:hidden bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 text-center"
        >
          {language === 'en'
            ? 'Offline mode — showing cached messages until connection returns.'
            : 'Sin conexión — mostrando datos guardados en caché.'}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-h-0 pb-16 lg:pb-0">
        {section === 'messages' && (
          <InboxSplitView
            uid={user.uid}
            language={language}
            channel="messages"
            items={messages}
            connections={connections}
            faqRules={faqRules}
            onOpenConnectModal={() => setShowConnectModal(true)}
          />
        )}
        {section === 'comments' && (
          <InboxSplitView
            uid={user.uid}
            language={language}
            channel="comments"
            items={comments}
            connections={connections}
            faqRules={faqRules}
            onOpenConnectModal={() => setShowConnectModal(true)}
          />
        )}
        {section === 'emails' && (
          <InboxSplitView
            uid={user.uid}
            language={language}
            channel="emails"
            items={emails}
            connections={connections}
            faqRules={faqRules}
            onOpenConnectModal={() => setShowConnectModal(true)}
          />
        )}
        {section === 'connections' && (
          <ConnectionsView
            uid={user.uid}
            language={language}
            connections={connections}
            faqRules={faqRules}
            onOpenConnectModal={() => setShowConnectModal(true)}
          />
        )}
        {section === 'ai_rules' && (
          <FaqAutomationView uid={user.uid} language={language} rules={faqRules} />
        )}
        {section === 'trash' && (
          <TrashView uid={user.uid} language={language} items={trash} />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (64px fixed, ergonomic thumb zone) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 pb-safe bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-6 items-center"
      >
        {[
          { id: 'messages' as const, label: t.nav.messages, icon: MessageSquare },
          { id: 'comments' as const, label: t.nav.comments, icon: MessageCircle },
          { id: 'emails' as const, label: t.nav.emails, icon: Mail },
          { id: 'connections' as const, label: language === 'en' ? 'Accounts' : 'Cuentas', icon: Link2 },
          { id: 'ai_rules' as const, label: language === 'en' ? 'AI' : 'IA', icon: Zap },
          { id: 'trash' as const, label: t.nav.trash, icon: Trash2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center px-1 ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[56px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {showConnectModal && (
        <ConnectAccountModal
          uid={user.uid}
          language={language}
          defaultChannel={
            section === 'comments' || section === 'emails' ? section : 'messages'
          }
          onClose={() => setShowConnectModal(false)}
        />
      )}
    </div>
  );
}
