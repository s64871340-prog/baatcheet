import React from 'react';
import { MessageSquare, Moon, Sun, Users, CheckCheck, Smile } from 'lucide-react';

interface AuthScreenProps {
  darkMode: boolean;
  loading: boolean;
  authError: string | null;
  onToggleDark: () => void;
  onSignIn: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  darkMode,
  loading,
  authError,
  onToggleDark,
  onSignIn,
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F0F2F5] dark:bg-[#111B21] transition-colors">
      {/* Authentic WhatsApp Emerald Top Strip */}
      <div className="h-44 sm:h-52 w-full bg-[#00A884] dark:bg-[#005C4B] shrink-0">
        <div className="max-w-5xl mx-auto px-6 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight whitespace-nowrap">BaatCheet</span>
          </div>

          <button
            type="button"
            onClick={onToggleDark}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-w-[44px] min-h-[44px] px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-24 sm:-mt-28 pb-10">
        <div className="w-full max-w-4xl bg-white dark:bg-[#202C33] rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/60 p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 flex flex-col gap-5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Fast, real-time messaging for direct &amp; group chats.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Sign in with Google to message contacts live, create group conversations, react with emojis, reply to threads, and see read receipts instantly.
            </p>

            <div className="flex flex-col gap-3 pt-1 text-sm text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-[#008069] dark:text-[#00A884] shrink-0" />
                <span>Direct 1:1 chats, custom groups, and the open BaatCheet Lounge</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCheck className="w-4 h-4 text-[#53BDEB] shrink-0" />
                <span>Real-time presence, typing indicators, and double-tick read receipts</span>
              </div>
              <div className="flex items-center gap-3">
                <Smile className="w-4 h-4 text-[#008069] dark:text-[#00A884] shrink-0" />
                <span>Replies, emoji reactions, starred messages, editing, and delete</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col items-stretch gap-4 bg-[#F7F8FA] dark:bg-[#111B21] rounded-xl p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Sign in to continue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synced securely with Firebase Authentication &amp; Cloud Firestore
              </p>
            </div>

            {authError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg p-3">
                {authError}
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={onSignIn}
              className="min-h-[48px] w-full px-5 py-3 rounded-xl bg-[#008069] hover:bg-[#006d59] dark:bg-[#00A884] dark:hover:bg-[#029676] disabled:opacity-60 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1H12v3.8h5.35c-.25 1.35-1.02 2.5-2.17 3.25v2.7h3.5c2.05-1.88 3.22-4.65 3.22-7.95 0-.6-.06-1.2-.15-1.8z"
                />
                <path
                  fill="currentColor"
                  d="M12 22c2.92 0 5.38-.97 7.18-2.62l-3.5-2.7c-.97.65-2.22 1.05-3.68 1.05-2.82 0-5.22-1.9-6.08-4.47H2.3v2.8C4.08 19.6 7.75 22 12 22z"
                />
                <path
                  fill="currentColor"
                  d="M5.92 13.26A6.03 6.03 0 0 1 5.6 12c0-.44.08-.86.2-1.26V7.94H2.3A9.96 9.96 0 0 0 1.2 12c0 1.6.38 3.12 1.1 4.46l3.62-3.2z"
                />
                <path
                  fill="currentColor"
                  d="M12 6.27c1.6 0 3.02.55 4.15 1.63l3.1-3.1C17.37 3.05 14.92 2 12 2 7.75 2 4.08 4.4 2.3 7.94l3.62 2.8C6.78 8.17 9.18 6.27 12 6.27z"
                />
              </svg>
              <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
