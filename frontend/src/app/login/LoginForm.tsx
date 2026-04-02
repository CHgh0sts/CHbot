'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block size-[1.1rem] shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-90 ${className}`}
      aria-hidden
    />
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/profile';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  const busy = loading || discordLoading;

  async function onDiscord() {
    setError(null);
    setDiscordLoading(true);
    try {
      await signIn('discord', { callbackUrl });
    } catch {
      setError('Impossible de lancer la connexion Discord.');
      setDiscordLoading(false);
    }
  }

  async function onCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError('Email ou mot de passe incorrect.');
        setLoading(false);
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError('Erreur réseau.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-300 bg-[#5865F2] px-4 py-3 font-medium text-white transition-opacity hover:bg-[#4752C4] disabled:cursor-wait disabled:opacity-85"
        onClick={() => void onDiscord()}
      >
        {discordLoading ? (
          <>
            <Spinner className="border-white border-t-transparent" />
            <span>Redirection vers Discord…</span>
          </>
        ) : (
          'Continuer avec Discord'
        )}
      </button>

      <div className="relative text-center text-sm text-zinc-500">
        <span className="bg-white px-2 dark:bg-zinc-950">ou email</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={onCredentials} className="space-y-4">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 py-2.5 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
