'use client';

import { useState, useEffect } from 'react';

export default function DesperdicioTab() {
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loadingDados, setLoadingDados] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Estados do formulário
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
    setIdProduto(''); // Exige clique em item válido da base
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
        return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' };
      case 'Defeito de fabrica':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
      case 'Mau uso':
        return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULÁRIO DE REGISTRO DE DESPERDÍCIO (APENAS BAIXA) */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>Registro de Desperdício (Baixa de Material)</h3>
        <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
          Registre perdas, avarias ou descartes de materiais. Esta operação realiza exclusivamente a baixa no saldo do estoque.
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

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* 1. Produto (atrelado aos produtos cadastrados na base) */}
          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
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
                border: idProduto ? '1px solid #16a34a' : '1px solid #cbd5e1',
                backgroundColor: idProduto ? '#f0fdf4' : '#fff',
                fontSize: '14px',
                outline: 'none',
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
                  backgroundColor: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  marginTop: '4px',
                }}
              >
                {sugestoesProdutos.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8' }}>
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
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                    >
                      <span>
                        <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>{prod.codigo}</strong> - {prod.nome}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>
                        Saldo: {prod.quantidade} {prod.unidade}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. Quantidade */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
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
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>

          {/* 3. Classificação */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
              Classificação *
            </label>
            <select
              value={classificacao}
              onChange={(e) => setClassificacao(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
            >
              <option value="">-- Selecione a classificação --</option>
              <option value="Acidente">Acidente</option>
              <option value="Defeito de fabrica">Defeito de fabrica</option>
              <option value="Mau uso">Mau uso</option>
            </select>
          </div>

          {/* 4. Colaborador Responsável */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
              Colaborador Responsável *
            </label>
            <input
              type="text"
              placeholder="Nome completo do colaborador responsável"
              value={colaboradorResponsavel}
              onChange={(e) => setColaboradorResponsavel(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>

          {/* 5. Descrição do ocorrido (até 1000 caracteres) */}
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>
                Descrição do Ocorrido *
              </label>
              <span style={{ fontSize: '12px', color: descricao.length >= 950 ? '#dc2626' : '#64748b' }}>
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
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={salvando}
              style={{
                padding: '12px 24px',
                backgroundColor: salvando ? '#991b1b' : '#dc2626',
                color: '#fff',
                border: 'none',
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
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginBottom: '16px', color: '#0f172a' }}>Histórico de Desperdícios</h3>

        {loadingDados ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Carregando histórico...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '13px' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Data / Hora</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Produto</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Qtd Baixada</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Classificação</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Colaborador</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Descrição do Ocorrido</th>
                </tr>
              </thead>
              <tbody>
                {historico.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      Nenhum registro de desperdício encontrado.
                    </td>
                  </tr>
                ) : (
                  historico.map((reg) => {
                    const prod = reg.produtos || {};
                    const badge = getBadgeStyle(reg.classificacao);
                    return (
                      <tr key={reg.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                        <td style={{ padding: '12px', color: '#64748b', whiteSpace: 'nowrap', fontSize: '13px' }}>
                          {new Date(reg.criado_em).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#0284c7' }}>
                            {prod.codigo}
                          </span>{' '}
                          - <span style={{ color: '#1e293b', fontWeight: '500' }}>{prod.nome}</span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#dc2626', whiteSpace: 'nowrap' }}>
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
                        <td style={{ padding: '12px', color: '#334155', fontWeight: '500' }}>
                          {reg.colaborador_responsavel}
                        </td>
                        <td style={{ padding: '12px', color: '#475569', fontSize: '13px', maxWidth: '320px' }}>
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