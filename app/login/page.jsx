'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0c0d10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#f8fafc',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#15171c',
          border: '1px solid rgba(212, 175, 55, 0.45)',
          borderRadius: '14px',
          padding: '36px 32px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* LOGOTIPO CENTRALIZADO (SEM CAMPO DE TEXTO) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: '24px',
            marginBottom: '24px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          }}
        >
          <img
            src="/logo.png"
            alt="Logotipo"
            style={{
              maxWidth: '190px',
              maxHeight: '64px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#9ca3af',
            marginBottom: '24px',
            letterSpacing: '0.3px',
          }}
        >
          Acesse o Painel de Controle de Estoque
        </p>

        {erro && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '18px',
              backgroundColor: 'rgba(185, 28, 28, 0.15)',
              color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                color: '#d1d5db',
              }}
            >
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@dmtrailers.com.br"
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                color: '#d1d5db',
              }}
            >
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '12px',
              background: loading
                ? '#272a34'
                : 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)',
              color: loading ? '#6b7280' : '#0c0d10',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              letterSpacing: '0.3px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s ease',
            }}
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}