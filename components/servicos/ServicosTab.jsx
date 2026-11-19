'use client';

import { useState, useEffect } from 'react';

export default function ServicosTab() {
  const [servicos, setServicos] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    unidade: 'HR',
    valor: '',
  });

  const carregarServicos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/servicos');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar serviços.');
      setServicos(Array.isArray(data) ? data : []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarServicos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const metodo = editandoId ? 'PUT' : 'POST';
      const payload = editandoId ? { id: editandoId, ...form } : form;

      const res = await fetch('/api/servicos', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar serviço.');

      setMensagem({
        tipo: 'sucesso',
        texto: editandoId
          ? `Serviço "${data.nome}" atualizado com sucesso!`
          : `Serviço "${data.nome}" cadastrado com sucesso!`,
      });

      setEditandoId(null);
      setForm({ codigo: '', nome: '', descricao: '', unidade: 'HR', valor: '' });
      carregarServicos();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (serv) => {
    setEditandoId(serv.id);
    setForm({
      codigo: serv.codigo,
      nome: serv.nome,
      descricao: serv.descricao || '',
      unidade: serv.unidade,
      valor: serv.valor,
    });
    setMensagem({ tipo: '', texto: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setForm({ codigo: '', nome: '', descricao: '', unidade: 'HR', valor: '' });
  };

  const handleExcluir = async (serv) => {
    if (!confirm(`Deseja realmente excluir o serviço "${serv.codigo} - ${serv.nome}"?`)) return;

    try {
      const res = await fetch(`/api/servicos?id=${serv.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir serviço.');

      setMensagem({ tipo: 'sucesso', texto: 'Serviço excluído com sucesso.' });
      carregarServicos();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const servicosFiltrados = servicos.filter(
    (s) =>
      s.codigo?.toLowerCase().includes(busca.toLowerCase()) ||
      s.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      s.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO DE SERVIÇOS */}
      <div
        style={{
          backgroundColor: '#15171c',
          padding: '24px',
          borderRadius: '12px',
          border: editandoId ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>
            {editandoId ? `Editando Serviço: ${form.nome}` : 'Cadastrar Novo Serviço'}
          </h3>
          {editandoId && (
            <button
              type="button"
              onClick={handleCancelarEdicao}
              style={{
                padding: '6px 12px',
                backgroundColor: '#1e2028',
                color: '#d1d5db',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Cancelar Edição
            </button>
          )}
        </div>
        <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '14px' }}>
          Cadastre mão de obra, solda, pintura ou serviços terceirizados para vinculação nas Estruturas BOM.
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

        <form onSubmit={handleSalvar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Código do Serviço *
            </label>
            <input
              type="text"
              name="codigo"
              value={form.codigo}
              onChange={handleChange}
              placeholder="Ex: SRV-SOLD-01"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Nome do Serviço *
            </label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: Solda MIG Chassi"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Unidade de Serviço *
            </label>
            <input
              type="text"
              list="unidades-servico-list"
              name="unidade"
              value={form.unidade}
              onChange={handleChange}
              placeholder="Ex: HR, UN, SV, DIA..."
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
            />
            <datalist id="unidades-servico-list">
              <option value="HR" />
              <option value="SV" />
              <option value="UN" />
              <option value="DIA" />
              <option value="M2" />
            </datalist>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Valor (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="valor"
              value={form.valor}
              onChange={handleChange}
              placeholder="0.00"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Descrição do Serviço
            </label>
            <textarea
              name="descricao"
              rows="2"
              value={form.descricao}
              onChange={handleChange}
              placeholder="Detalhes do escopo, especificações técnicas ou observações..."
              style={{ width: '100%', padding: '10px', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
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
              {salvando ? 'Salvando...' : editandoId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
            </button>
          </div>
        </form>
      </div>

      {/* TABELA DE SERVIÇOS CADASTRADOS */}
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>Serviços Cadastrados</h3>
          <button
            onClick={carregarServicos}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e2028',
              color: '#e5c158',
              border: '1px solid rgba(212, 175, 55, 0.45)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Atualizar Lista
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar serviço por código, nome ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', marginBottom: '20px', borderRadius: '6px', fontSize: '14px' }}
        />

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Carregando serviços...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '720px' }}>
              <thead>
                <tr style={{ backgroundColor: '#111216', color: '#d4af37', fontSize: '13px' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Código</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Nome do Serviço</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Descrição</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Unidade</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Valor</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {servicosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      Nenhum serviço encontrado.
                    </td>
                  </tr>
                ) : (
                  servicosFiltrados.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.12)' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: '#e5c158' }}>
                        {item.codigo}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500', color: '#f8fafc' }}>
                        {item.nome}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#9ca3af', maxWidth: '280px' }}>
                        {item.descricao || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#d1d5db' }}>
                        <span style={{ backgroundColor: '#1e2028', border: '1px solid rgba(212, 175, 55, 0.25)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          {item.unidade}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: '#4ade80' }}>
                        R$ {Number(item.valor || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleEditar(item)}
                          style={{ padding: '6px 12px', marginRight: '6px', backgroundColor: '#d4af37', color: '#0c0d10', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleExcluir(item)}
                          style={{ padding: '6px 12px', backgroundColor: '#991b1b', color: '#fef2f2', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          Excluir
                        </button>
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