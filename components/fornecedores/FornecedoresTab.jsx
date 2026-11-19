'use client';

import { useState, useEffect } from 'react';

export default function FornecedoresTab() {
  const [fornecedores, setFornecedores] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [form, setForm] = useState({
    nome_empresa: '',
    cnpj: '',
    telefone: '',
    email: '',
    observacao: '',
  });

  const carregarFornecedores = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fornecedores');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar fornecedores.');
      setFornecedores(Array.isArray(data) ? data : []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const res = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar fornecedor.');

      setMensagem({ tipo: 'sucesso', texto: `Fornecedor "${data.nome_empresa}" cadastrado com sucesso!` });
      setForm({
        nome_empresa: '',
        cnpj: '',
        telefone: '',
        email: '',
        observacao: '',
      });
      carregarFornecedores();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  const fornecedoresFiltrados = fornecedores.filter(
    (f) =>
      f.nome_empresa?.toLowerCase().includes(busca.toLowerCase()) ||
      f.cnpj?.includes(busca) ||
      f.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULÁRIO DE CADASTRO COMPLETO */}
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
        <h3 style={{ marginBottom: '8px', color: '#f8fafc', fontSize: '18px' }}>Novo Cadastro de Fornecedor</h3>
        <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '14px' }}>
          Preencha as informações completas do fornecedor para salvar no banco de dados.
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

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Razão Social / Nome da Empresa *
            </label>
            <input
              type="text"
              name="nome_empresa"
              value={form.nome_empresa}
              onChange={handleChange}
              placeholder="Ex: Aços Brasil Ltda"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              CNPJ *
            </label>
            <input
              type="text"
              name="cnpj"
              value={form.cnpj}
              onChange={handleChange}
              placeholder="Ex: 00.000.000/0001-00"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Telefone / WhatsApp
            </label>
            <input
              type="text"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              placeholder="Ex: (11) 99999-9999"
              style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              E-mail de Contato
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Ex: vendas@fornecedor.com.br"
              style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Observações / Anotações
            </label>
            <textarea
              name="observacao"
              rows="3"
              value={form.observacao}
              onChange={handleChange}
              placeholder="Anotações sobre condições de pagamento, prazos de entrega habituais ou pessoa de contato..."
              style={{ width: '100%', padding: '10px', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={salvando}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)',
                color: '#0c0d10',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: salvando ? 'not-allowed' : 'pointer',
              }}
            >
              {salvando ? 'Cadastrando...' : 'Salvar Fornecedor'}
            </button>
          </div>
        </form>
      </div>

      {/* TABELA DE LISTAGEM DOS FORNECEDORES */}
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
        <h3 style={{ marginBottom: '16px', color: '#f8fafc', fontSize: '18px' }}>Fornecedores Cadastrados</h3>

        <input
          type="text"
          placeholder="Buscar por Razão Social, CNPJ ou E-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', marginBottom: '20px', borderRadius: '6px', fontSize: '14px' }}
        />

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Carregando fornecedores...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#111216', color: '#d4af37', fontSize: '13px' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Razão Social</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>CNPJ</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Telefone</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>E-mail</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Observação</th>
                </tr>
              </thead>
              <tbody>
                {fornecedoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      Nenhum fornecedor encontrado.
                    </td>
                  </tr>
                ) : (
                  fornecedoresFiltrados.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.12)' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>
                        {item.nome_empresa}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace', color: '#e5c158' }}>
                        {item.cnpj}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#d1d5db' }}>
                        {item.telefone || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#d1d5db' }}>
                        {item.email || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#9ca3af', maxWidth: '250px' }}>
                        {item.observacao || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}