import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { ArrowRight, Check, ExternalLink, MailCheck, RefreshCw } from 'lucide-react';
import { auth, firebaseProjectId, googleProvider } from '../firebase/config';
import { getTranslations } from '../i18n/translations';
import type { Language } from '../types/omnichat';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  unverifiedUser: User | null;
  onVerifiedRefresh: () => Promise<void>;
}

export function AuthScreen({
  language,
  onLanguageChange,
  unverifiedUser,
  onVerifiedRefresh,
}: AuthScreenProps) {
  const t = getTranslations(language);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailProviderDisabled, setEmailProviderDisabled] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState('');

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setEmailProviderDisabled(false);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        await sendEmailVerification(cred.user);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setEmailProviderDisabled(true);
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg(
          language === 'en'
            ? 'This email is already registered. Try signing in instead.'
            : 'Este correo ya está registrado. Intenta iniciar sesión.',
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorMsg(
          language === 'en'
            ? 'Incorrect email or password.'
            : 'Correo o contraseña incorrectos.',
        );
      } else if (code === 'auth/weak-password') {
        setErrorMsg(
          language === 'en'
            ? 'Password must be at least 6 characters.'
            : 'La contraseña debe tener al menos 6 caracteres.',
        );
      } else {
        setErrorMsg(err instanceof Error ? err.message : t.auth.genericError);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMsg('');
    setEmailProviderDisabled(false);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t.auth.genericError);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedUser) return;
    setVerifyNotice('');
    try {
      await sendEmailVerification(unverifiedUser);
      setVerifyNotice(t.auth.verifySentToast);
    } catch (err: unknown) {
      setVerifyNotice(err instanceof Error ? err.message : t.auth.genericError);
    }
  }

  async function handleCheckVerified() {
    if (!unverifiedUser) return;
    setVerifyNotice('');
    setLoading(true);
    try {
      await onVerifiedRefresh();
      if (!auth.currentUser?.emailVerified) {
        setVerifyNotice(t.auth.verifyNotYet);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-2 sm:gap-8">
        <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          {t.brand}
        </span>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <PWAInstallButton language={language} compact />
          <div
            role="group"
            aria-label={t.common.languageLabel}
            className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg shrink-0"
          >
            <button
              type="button"
              onClick={() => onLanguageChange('es')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                language === 'es'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                language === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-slate-900 leading-[1.15] [text-wrap:balance] mb-5">
            {t.auth.heroTitle}
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
            {t.auth.heroDesc}
          </p>
          <ul className="space-y-3.5 text-sm text-slate-700 border-t border-slate-200 pt-6 max-w-xl">
            <li className="flex items-start gap-3">
              <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <span>{t.auth.heroBullet1}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <span>{t.auth.heroBullet2}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <span>{t.auth.heroBullet3}</span>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-6 flex items-center justify-center">
          {unverifiedUser ? (
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <MailCheck className="w-5 h-5" />
              </div>
              <h2 className="font-display text-xl font-semibold text-slate-900 mb-2">
                {t.auth.verifyTitle}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-2">
                {t.auth.verifyDesc}{' '}
                <span className="font-medium text-slate-900">{unverifiedUser.email}</span>.
              </p>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                {t.auth.verifyNote}
              </p>
              {verifyNotice && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
                  {verifyNotice}
                </p>
              )}
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCheckVerified}
                  className="w-full min-h-[44px] px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t.auth.verifyRefresh}</span>
                </button>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 py-2"
                  >
                    {t.auth.verifyResend}
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut(auth)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 py-2"
                  >
                    {t.auth.signOut}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg('');
                    setEmailProviderDisabled(false);
                  }}
                  className={`py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    mode === 'signin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.auth.signInTab}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                    setEmailProviderDisabled(false);
                  }}
                  className={`py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.auth.signUpTab}
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {t.auth.nameLabel}
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      maxLength={100}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t.auth.namePlaceholder}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t.auth.emailLabel}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t.auth.passwordLabel}
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                    {errorMsg}
                  </p>
                )}

                {emailProviderDisabled && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 space-y-2">
                    <p className="font-semibold">{t.auth.emailNotEnabledTitle}</p>
                    <p className="leading-relaxed text-amber-800">{t.auth.emailNotEnabledDesc}</p>
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/providers`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-amber-900 underline hover:text-amber-700"
                    >
                      <span>{t.auth.openFirebaseConsole}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{mode === 'signin' ? t.auth.signInButton : t.auth.signUpButton}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-500">{t.auth.orDivider}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full min-h-[44px] px-4 py-2.5 bg-white border border-slate-300 text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>{t.auth.googleButton}</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
