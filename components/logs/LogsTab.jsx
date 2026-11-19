'use client';

import { useState, useEffect } from 'react';

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregarLogs = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar logs de atividade.');
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  return (
    <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '18px' }}>Log de Atividades do Sistema</h3>
        <button
          onClick={carregarLogs}
          style={{ padding: '8px 16px', backgroundColor: '#1e2028', color: '#e5c158', border: '1px solid rgba(212, 175, 55, 0.45)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Atualizar Logs
        </button>
      </div>

      {erro && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(185, 28, 28, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {erro}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Carregando histórico de auditoria...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#111216', color: '#d4af37', fontSize: '13px' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Data / Hora</th>
                <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Usuário</th>
                <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Ação</th>
                <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.12)', fontSize: '13px' }}>
                    <td style={{ padding: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {new Date(log.criado_em).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px', color: '#f8fafc', fontWeight: '500' }}>
                      {log.usuarios?.nome || 'Sistema'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', color: '#e5c158', border: '1px solid rgba(212, 175, 55, 0.35)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {log.acao}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#9ca3af', fontFamily: 'monospace', fontSize: '12px' }}>
                      {JSON.stringify(log.detalhes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}