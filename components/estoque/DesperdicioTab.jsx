'use client';

import { useState, useEffect } from 'react';

export default function DesperdicioTab() {
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loadingDados, setLoadingDados] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [idProduto, setIdProduto] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [colaboradorResponsavel, setColaboradorResponsavel] = useState('');
  const [classificacao, setClassificacao] = useState('');
  const [descricao, setDescricao] = useState('');

  const carregarDados = async () => {
    setLoadingDados(true);
    try {
      const [resProds, resHist] = await Promise.all([
        fetch('/api/produtos'),
        fetch('/api/estoque/desperdicio'),
      ]);

      const dataProds = await resProds.json();
      const dataHist = await resHist.json();

      if (resProds.ok && Array.isArray(dataProds)) {
        setProdutosDisponiveis(dataProds);
      }
      if (resHist.ok && Array.isArray(dataHist)) {
        setHistorico(dataHist);
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados de produtos e desperdícios.' });
    } finally {
      setLoadingDados(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleBuscaChange = (texto) => {
    setTermoBusca(texto);
    setIdProduto('');
    setDropdownAberto(true);
  };

  const handleSelecionarProduto = (prod) => {
    setIdProduto(prod.id);
    setTermoBusca(`${prod.codigo} - ${prod.nome} (Saldo: ${prod.quantidade} ${prod.unidade})`);
    setDropdownAberto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });

    if (!idProduto) {
      return setMensagem({
        tipo: 'erro',
        texto: 'Selecione um produto válido cadastrado na base de dados.',
      });
    }

    if (!quantidade || parseFloat(quantidade) <= 0 || !colaboradorResponsavel.trim() || !classificacao || !descricao.trim()) {
      return setMensagem({
        tipo: 'erro',
        texto: 'Preencha todos os campos obrigatórios antes de registrar a baixa.',
      });
    }

    if (descricao.length > 1000) {
      return setMensagem({
        tipo: 'erro',
        texto: 'A descrição do ocorrido ultrapassou o limite de 1000 caracteres.',
      });
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/estoque/desperdicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_produto: idProduto,
          quantidade: parseFloat(quantidade),
          colaborador_responsavel: colaboradorResponsavel.trim(),
          classificacao,
          descricao: descricao.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar baixa por desperdício.');

      setMensagem({ tipo: 'sucesso', texto: data.message });
      setIdProduto('');
      setTermoBusca('');
      setQuantidade('');
      setColaboradorResponsavel('');
      setClassificacao('');
      setDescricao('');
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  const termoLimpo = termoBusca.trim().toLowerCase();
  const sugestoesProdutos = produtosDisponiveis.filter(
    (p) =>
      p.codigo?.toLowerCase().includes(termoLimpo) ||
      p.nome?.toLowerCase().includes(termoLimpo)
  );

  const getBadgeStyle = (tipoClassif) => {
    switch (tipoClassif) {
      case 'Acidente':
        return { backgroundColor: 'rgba(212, 175, 55, 0.2)', color: '#e5c158', border: '1px solid rgba(212, 175, 55, 0.5)' };
      case 'Defeito de fabrica':
        return { backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.4)' };
      case 'Mau uso':
        return { backgroundColor: 'rgba(185, 28, 28, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.5)' };
      default:
        return { backgroundColor: '#1e2028', color: '#9ca3af' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULÁRIO DE REGISTRO DE DESPERDÍCIO */}
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
        <h3 style={{ marginBottom: '8px', color: '#f8fafc', fontSize: '18px' }}>Registro de Desperdício (Baixa de Material)</h3>
        <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '14px' }}>
          Registre perdas, avarias ou descartes de materiais. Esta operação realiza exclusivamente a baixa no saldo do estoque.
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
          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Produto *
            </label>
            <input
              type="text"
              placeholder="Digite o código (SKU) ou nome do produto cadastrado..."
              value={termoBusca}
              onChange={(e) => handleBuscaChange(e.target.value)}
              onFocus={() => setDropdownAberto(true)}
              onBlur={() => setTimeout(() => setDropdownAberto(false), 180)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: idProduto ? '1px solid #d4af37' : undefined,
                fontSize: '14px',
              }}
            />

            {dropdownAberto && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: '220px',
                  overflowY: 'auto',
                  backgroundColor: '#111216',
                  border: '1px solid rgba(212, 175, 55, 0.45)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                  zIndex: 50,
                  marginTop: '4px',
                }}
              >
                {sugestoesProdutos.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>
                    Nenhum produto cadastrado encontrado.
                  </div>
                ) : (
                  sugestoesProdutos.map((prod) => (
                    <div
                      key={prod.id}
                      onMouseDown={() => handleSelecionarProduto(prod)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(212, 175, 55, 0.12)',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#f8fafc',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e2028')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span>
                        <strong style={{ color: '#e5c158', fontFamily: 'monospace' }}>{prod.codigo}</strong> - {prod.nome}
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        Saldo: {prod.quantidade} {prod.unidade}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Quantidade (Baixa) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex: 2.50"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Classificação *
            </label>
            <select
              value={classificacao}
              onChange={(e) => setClassificacao(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', fontSize: '14px' }}
            >
              <option value="">-- Selecione a classificação --</option>
              <option value="Acidente">Acidente</option>
              <option value="Defeito de fabrica">Defeito de fabrica</option>
              <option value="Mau uso">Mau uso</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
              Colaborador Responsável *
            </label>
            <input
              type="text"
              placeholder="Nome completo do colaborador responsável"
              value={colaboradorResponsavel}
              onChange={(e) => setColaboradorResponsavel(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', color: '#d1d5db' }}>
                Descrição do Ocorrido *
              </label>
              <span style={{ fontSize: '12px', color: descricao.length >= 950 ? '#f87171' : '#9ca3af' }}>
                {descricao.length} / 1000 caracteres
              </span>
            </div>
            <textarea
              rows="4"
              maxLength={1000}
              placeholder="Descreva detalhadamente o motivo e as circunstâncias do desperdício..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={salvando}
              style={{
                padding: '12px 24px',
                backgroundColor: salvando ? '#7f1d1d' : '#991b1b',
                color: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: salvando ? 'not-allowed' : 'pointer',
              }}
            >
              {salvando ? 'Registrando Baixa...' : 'Registrar Baixa por Desperdício'}
            </button>
          </div>
        </form>
      </div>

      {/* HISTÓRICO DE DESPERDÍCIOS REGISTRADOS */}
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
        <h3 style={{ marginBottom: '16px', color: '#f8fafc', fontSize: '18px' }}>Histórico de Desperdícios</h3>

        {loadingDados ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Carregando histórico...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#111216', color: '#d4af37', fontSize: '13px' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Data / Hora</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Produto</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Qtd Baixada</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Classificação</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Colaborador</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Descrição do Ocorrido</th>
                </tr>
              </thead>
              <tbody>
                {historico.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      Nenhum registro de desperdício encontrado.
                    </td>
                  </tr>
                ) : (
                  historico.map((reg) => {
                    const prod = reg.produtos || {};
                    const badge = getBadgeStyle(reg.classificacao);
                    return (
                      <tr key={reg.id} style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.12)', fontSize: '14px' }}>
                        <td style={{ padding: '12px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: '13px' }}>
                          {new Date(reg.criado_em).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#e5c158' }}>
                            {prod.codigo}
                          </span>{' '}
                          - <span style={{ color: '#f8fafc', fontWeight: '500' }}>{prod.nome}</span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#f87171', whiteSpace: 'nowrap' }}>
                          -{reg.quantidade} {prod.unidade}
                        </td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              ...badge,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                            }}
                          >
                            {reg.classificacao}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#e2e8f0', fontWeight: '500' }}>
                          {reg.colaborador_responsavel}
                        </td>
                        <td style={{ padding: '12px', color: '#9ca3af', fontSize: '13px', maxWidth: '320px' }}>
                          {reg.descricao}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}