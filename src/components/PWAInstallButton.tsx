import { useRef, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { Language } from '../types/omnichat';

interface PWAInstallButtonProps {
  language: Language;
  compact?: boolean;
}

export function PWAInstallButton({ language, compact = false }: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isIOSNonSafari,
    isInAppBrowser,
    isInIframe,
    install,
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  const [checkingPrompt, setCheckingPrompt] = useState(false);

  if (isInstalled) {
    return null;
  }

  const fullLabel = language === 'en' ? 'Install app' : 'Instalar app';
  const shortLabel = language === 'en' ? 'Install' : 'Instalar';
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const openUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function handleClick() {
    if (checkingPrompt) return;
    setCheckingPrompt(true);
    try {
      const result = await install();
      if (result === 'accepted' || result === 'dismissed') {
        return;
      }
    } finally {
      setCheckingPrompt(false);
    }
    setShowGuide(true);
  }

  async function handleCopyUrl() {
    const targetUrl = appUrl || openUrl;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    } catch {
      // Fallback for iframes where Clipboard API is blocked
    }

    if (urlInputRef.current) {
      urlInputRef.current.focus();
      urlInputRef.current.select();
      urlInputRef.current.setSelectionRange(0, targetUrl.length);
      try {
        if (document.execCommand('copy')) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch {
        // User can tap copy from the selected field
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label={fullLabel}
        title={fullLabel}
        className={
          compact
            ? 'min-h-[34px] px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0'
            : 'w-full min-h-[40px] px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{compact ? shortLabel : fullLabel}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="pwa-guide-title" className="font-display text-lg font-semibold text-slate-900">
                  {language === 'en'
                    ? 'Install OmniChat Hub on mobile'
                    : 'Instalar OmniChat Hub en el móvil'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'en'
                    ? 'Add the app to your home screen for full-screen access.'
                    : 'Añade la app a tu pantalla de inicio para usarla como aplicación nativa.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label={language === 'en' ? 'Close' : 'Cerrar'}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isInstallable && (
              <button
                type="button"
                onClick={() => {
                  void install().then((res) => {
                    if (res === 'accepted') setShowGuide(false);
                  });
                }}
                className="w-full min-h-[44px] px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'en' ? 'Install app now' : 'Instalar aplicación ahora'}</span>
              </button>
            )}

            {(isInIframe || isInAppBrowser || isIOSNonSafari) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5 text-xs text-amber-900">
                <p className="font-semibold">
                  {isInIframe
                    ? language === 'en'
                      ? 'Opened inside an embedded frame'
                      : 'Abierta dentro de una vista previa o marco'
                    : isInAppBrowser
                      ? language === 'en'
                        ? 'Opened inside an in-app browser'
                        : 'Abierta dentro de un navegador integrado'
                      : language === 'en'
                        ? 'Open in Safari to install on iPhone'
                        : 'Abre en Safari para instalar en iPhone'}
                </p>
                <p className="leading-relaxed text-amber-800">
                  {isInIframe
                    ? language === 'en'
                      ? 'Mobile browsers block app installation inside embedded frames. Open the direct app URL in its own Chrome (Android) or Safari (iPhone) tab.'
                      : 'Los navegadores bloquean la instalación dentro de marcos incrustados. Abre el enlace directo en su propia pestaña de Chrome (Android) o Safari (iPhone).'
                    : isInAppBrowser
                      ? language === 'en'
                        ? 'In-app browsers (WhatsApp, Gmail, Instagram, Google App) do not support installing apps. Open this link in Chrome or Safari.'
                        : 'Los visores internos (WhatsApp, Gmail, Instagram, app de Google) no permiten instalar apps. Abre este enlace en Chrome o Safari.'
                      : language === 'en'
                        ? 'On iPhone and iPad, Safari is required to add the app to your Home Screen.'
                        : 'En iPhone y iPad necesitas abrir este enlace en Safari para añadir la app a la pantalla de inicio.'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {openUrl && (
                    <a
                      href={openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        {language === 'en' ? 'Open in new tab' : 'Abrir en nueva pestaña'}
                      </span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCopyUrl()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-300 rounded-lg font-medium text-amber-900 hover:bg-amber-100/50"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>
                      {copied
                        ? language === 'en'
                          ? 'Link copied'
                          : 'Enlace copiado'
                        : language === 'en'
                          ? 'Copy link'
                          : 'Copiar enlace'}
                    </span>
                  </button>
                </div>

                <input
                  ref={urlInputRef}
                  type="text"
                  readOnly
                  value={appUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={language === 'en' ? 'App URL' : 'URL de la aplicación'}
                  className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-white border border-amber-200 rounded-md text-slate-700 select-all"
                />
              </div>
            )}

            <div className="space-y-3.5 text-sm text-slate-700">
              {(!isIOS || isInstallable) && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-slate-900">Android (Google Chrome)</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed">
                    <li>
                      {language === 'en'
                        ? 'Open the published URL directly in Google Chrome (not inside an embedded preview or messaging app).'
                        : 'Abre el enlace publicado directamente en Google Chrome (no en vista previa ni dentro de WhatsApp o Gmail).'}
                    </li>
                    <li>
                      {language === 'en'
                        ? 'Tap the top-right menu (three dots) and choose "Add to Home screen" or "Install app".'
                        : 'Pulsa el menú superior derecho (⋮) y elige "Instalar aplicación" o "Añadir a pantalla de inicio".'}
                    </li>
                    <li>
                      {language === 'en'
                        ? 'If two options appear, choose "Install" to add the standalone app.'
                        : 'Si aparecen dos opciones, elige "Instalar" para instalar la app completa.'}
                    </li>
                  </ol>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Share className="w-4 h-4 text-blue-600 shrink-0" />
                  <p className="font-semibold text-slate-900">iPhone / iPad (Safari)</p>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed">
                  <li>
                    {language === 'en'
                      ? 'Open the published URL directly in Safari.'
                      : 'Abre el enlace publicado directamente en Safari.'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Tap the Share button at the bottom of Safari.'
                      : 'Pulsa el botón Compartir (cuadrado con flecha arriba) en la barra inferior.'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Tap "Add to Home Screen" and confirm "Add".'
                      : 'Desliza hacia abajo, pulsa "Añadir a la pantalla de inicio" y confirma en "Añadir".'}
                  </li>
                </ol>
              </div>
            </div>

            {!isInIframe && !isInAppBrowser && !isIOSNonSafari && (
              <button
                type="button"
                onClick={() => void handleCopyUrl()}
                className="w-full min-h-[40px] px-4 py-2 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copied
                    ? language === 'en'
                      ? 'Link copied'
                      : 'Enlace copiado'
                    : language === 'en'
                      ? 'Copy app link'
                      : 'Copiar enlace de la app'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              {language === 'en' ? 'Got it' : 'Entendido'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
