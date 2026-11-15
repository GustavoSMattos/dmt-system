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
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
      <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>Alterar Minha Senha</h3>
      <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
        Informe sua senha atual e defina uma nova senha de acesso ao sistema.
      </p>

      {mensagem.texto && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            backgroundColor: mensagem.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
            color: mensagem.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
            fontSize: '14px',
          }}
        >
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Senha Atual *
          </label>
          <input
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            required
            placeholder="Digite sua senha atual"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Nova Senha * (mín. 6 caracteres)
          </label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
            minLength={6}
            placeholder="Digite a nova senha"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Confirmar Nova Senha *
          </label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
            minLength={6}
            placeholder="Repita a nova senha"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '12px 24px',
            backgroundColor: loading ? '#0369a1' : '#0284c7',
            color: '#fff',
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