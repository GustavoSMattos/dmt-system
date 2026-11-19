'use client';

import { useState } from 'react';

export default function AlterarSenhaTab() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });

    if (novaSenha.length < 6) {
      return setMensagem({ tipo: 'erro', texto: 'A nova senha deve conter pelo menos 6 caracteres.' });
    }

    if (novaSenha !== confirmarSenha) {
      return setMensagem({ tipo: 'erro', texto: 'A nova senha e a confirmação não coincidem.' });
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar a senha.');

      setMensagem({ tipo: 'sucesso', texto: data.message });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)', maxWidth: '500px' }}>
      <h3 style={{ marginBottom: '8px', color: '#f8fafc', fontSize: '18px' }}>Alterar Minha Senha</h3>
      <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '14px' }}>
        Informe sua senha atual e defina uma nova senha de acesso ao sistema.
      </p>

      {mensagem.texto && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            backgroundColor: mensagem.tipo === 'sucesso' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(185, 28, 28, 0.15)',
            color: mensagem.tipo === 'sucesso' ? '#4ade80' : '#fca5a5',
            border: `1px solid ${mensagem.tipo === 'sucesso' ? 'rgba(74, 222, 128, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            fontSize: '14px',
          }}
        >
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
            Senha Atual *
          </label>
          <input
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            required
            placeholder="Digite sua senha atual"
            style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
            Nova Senha * (mín. 6 caracteres)
          </label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
            minLength={6}
            placeholder="Digite a nova senha"
            style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
            Confirmar Nova Senha *
          </label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
            minLength={6}
            placeholder="Repita a nova senha"
            style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)',
            color: '#0c0d10',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Atualizando Senha...' : 'Salvar Nova Senha'}
        </button>
      </form>
    </div>
  );
}