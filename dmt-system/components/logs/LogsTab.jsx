'use client';

import { useState, useEffect } from 'react';

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch('/api/logs')
      .then((res) => {
        if (!res.ok) throw new Error('Acesso restrito a administradores.');
        return res.json();
      })
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setErro(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando histórico de auditoria...</div>;
  if (erro) return <div style={{ color: '#ef4444', fontWeight: 'bold' }}>{erro}</div>;

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '16px', color: '#0f172a' }}>Log de Atividades do Sistema</h3>
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
            <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Data / Hora</th>
            <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Usuário</th>
            <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Ação Executada</th>
            <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                {new Date(log.criado_em).toLocaleString('pt-BR')}
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                {log.usuarios?.nome || 'Sistema'}
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: 'bold' }}>
                {log.acao}
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', fontFamily: 'monospace' }}>
                {JSON.stringify(log.detalhes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}