'use client';

import { useState, useEffect } from 'react';

export default function EstoqueTab() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [ordenacao, setOrdenacao] = useState('az'); // 'az' | 'za' | 'maior_qtd' | 'menor_qtd' | 'maior_leadtime' | 'menor_leadtime'
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Estados para Modal de Edição
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({
    nome: '',
    categoria: '',
    estoque_minimo: '0',
    valor_unitario: '0',
    leadtime: '0',
  });
  const [confirmacaoEdicaoNome, setConfirmacaoEdicaoNome] = useState('');

  // Estados para Modal de Exclusão com Validação de Nome
  const [produtoExcluindo, setProdutoExcluindo] = useState(null);
  const [confirmacaoExclusaoNome, setConfirmacaoExclusaoNome] = useState('');
  const [processandoAcao, setProcessandoAcao] = useState(false);

  const carregarProdutos = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/produtos');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar lista de produtos.');
      setProdutos(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  // Lista de categorias únicas extraídas dos produtos cadastrados
  const categoriasUnicas = Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean))).sort();

  // 1. Filtragem por Busca Textual + Categoria
  const produtosFiltrados = produtos.filter((p) => {
    const bateTexto =
      p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busca.toLowerCase());
    const bateCategoria = categoriaFiltro ? p.categoria === categoriaFiltro : true;
    return bateTexto && bateCategoria;
  });

  // 2. Ordenação dinâmica conforme seletor
  const produtosOrdenados = [...produtosFiltrados].sort((a, b) => {
    switch (ordenacao) {
      case 'az':
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
      case 'za':
        return (b.nome || '').localeCompare(a.nome || '', 'pt-BR', { sensitivity: 'base' });
      case 'maior_qtd':
        return Number(b.quantidade || 0) - Number(a.quantidade || 0);
      case 'menor_qtd':
        return Number(a.quantidade || 0) - Number(b.quantidade || 0);
      case 'maior_leadtime':
        return Number(b.leadtime || 0) - Number(a.leadtime || 0);
      case 'menor_leadtime':
        return Number(a.leadtime || 0) - Number(b.leadtime || 0);
      default:
        return 0;
    }
  });

  // Abrir Modal de Edição
  const handleAbrirEdicao = (prod) => {
    setProdutoEditando(prod);
    setFormEdit({
      nome: prod.nome || '',
      categoria: prod.categoria || '',
      estoque_minimo: prod.estoque_minimo ?? '0',
      valor_unitario: prod.valor_unitario ?? '0',
      leadtime: prod.leadtime ?? '0',
    });
    setConfirmacaoEdicaoNome('');
  };

  // Salvar Edição (exige confirmação do nome original do produto)
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!produtoEditando || confirmacaoEdicaoNome !== produtoEditando.nome) return;

    setProcessandoAcao(true);
    try {
      const res = await fetch('/api/produtos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: produtoEditando.id,
          ...formEdit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar produto.');

      setProdutoEditando(null);
      setConfirmacaoEdicaoNome('');
      carregarProdutos();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  // Abrir Modal de Exclusão
  const handleAbrirExclusao = (prod) => {
    setProdutoExcluindo(prod);
    setConfirmacaoExclusaoNome('');
  };

  // Confirmar Exclusão
  const handleConfirmarExclusao = async () => {
    if (!produtoExcluindo || confirmacaoExclusaoNome !== produtoExcluindo.nome) return;

    setProcessandoAcao(true);
    try {
      const res = await fetch(`/api/produtos?id=${produtoExcluindo.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir produto.');

      setProdutoExcluindo(null);
      setConfirmacaoExclusaoNome('');
      carregarProdutos();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: '#0f172a', margin: 0 }}>Produtos no Estoque</h3>
        <button
          onClick={carregarProdutos}
          style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
        >
          Atualizar Lista
        </button>
      </div>

      {/* Barra de Filtros e Ordenação */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nome ou código (SKU)..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ flex: 2, minWidth: '220px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
        />

        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          style={{ flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
        >
          <option value="">Todas as Categorias</option>
          {categoriasUnicas.map((cat, idx) => (
            <option key={idx} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value)}
          style={{ flex: 1, minWidth: '210px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
        >
          <option value="az">Ordenar: De A a Z</option>
          <option value="za">Ordenar: De Z a A</option>
          <option value="maior_qtd">Ordenar: Maior quantidade em estoque</option>
          <option value="menor_qtd">Ordenar: Menor quantidade em estoque</option>
          <option value="maior_leadtime">Ordenar: Maior Leadtime</option>
          <option value="menor_leadtime">Ordenar: Menor Leadtime</option>
        </select>
      </div>

      {erro && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {erro}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Carregando estoque...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '13px' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Código</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Nome do Produto</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Categoria</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Qtd Atual</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Estoque Mín.</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Lead Time</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Valor Unit.</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                produtosOrdenados.map((item) => {
                  const abaixoDoMinimo = Number(item.quantidade) <= Number(item.estoque_minimo || 0);
                  const temLeadtime = item.leadtime !== null && item.leadtime !== undefined && Number(item.leadtime) > 0;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: '#0284c7' }}>
                        {item.codigo}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                        {item.nome}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          {item.categoria}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: abaixoDoMinimo ? '#dc2626' : '#16a34a' }}>
                        {item.quantidade} {item.unidade}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                        {item.estoque_minimo || 0} {item.unidade}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {temLeadtime ? (
                          <span style={{ color: '#334155', fontWeight: '500' }}>{item.leadtime} dia(s)</span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fcd34d',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                            }}
                          >
                            N/D
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                        R$ {Number(item.valor_unitario || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleAbrirEdicao(item)}
                          style={{ padding: '6px 12px', marginRight: '6px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleAbrirExclusao(item)}
                          style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE EDIÇÃO COM CONFIRMAÇÃO POR NOME */}
      {produtoEditando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Editar Produto ({produtoEditando.codigo})</h4>
            <form onSubmit={handleSalvarEdicao}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Nome do Produto</label>
                <input
                  type="text"
                  value={formEdit.nome}
                  onChange={(e) => setFormEdit({ ...formEdit, nome: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Categoria</label>
                <input
                  type="text"
                  value={formEdit.categoria}
                  onChange={(e) => setFormEdit({ ...formEdit, categoria: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Preço Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formEdit.valor_unitario}
                    onChange={(e) => setFormEdit({ ...formEdit, valor_unitario: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Estoque Mínimo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formEdit.estoque_minimo}
                    onChange={(e) => setFormEdit({ ...formEdit, estoque_minimo: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Lead Time (dias)</label>
                <input
                  type="number"
                  min="0"
                  value={formEdit.leadtime}
                  onChange={(e) => setFormEdit({ ...formEdit, leadtime: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {/* Bloco de Confirmação Obrigatória para Salvar Edição */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                  Para confirmar a edição, digite o nome atual do produto:
                </label>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', backgroundColor: '#fff', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '8px', userSelect: 'all' }}>
                  {produtoEditando.nome}
                </div>
                <input
                  type="text"
                  placeholder="Digite o nome exato para confirmar..."
                  value={confirmacaoEdicaoNome}
                  onChange={(e) => setConfirmacaoEdicaoNome(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setProdutoEditando(null)}
                  style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={confirmacaoEdicaoNome !== produtoEditando.nome || processandoAcao}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: confirmacaoEdicaoNome === produtoEditando.nome ? '#0284c7' : '#93c5fd',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: confirmacaoEdicaoNome === produtoEditando.nome && !processandoAcao ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                  }}
                >
                  {processandoAcao ? 'Salvando...' : 'Confirmar Edição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO COM VALIDAÇÃO POR NOME */}
      {produtoExcluindo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '450px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#b91c1c' }}>Confirmar Exclusão</h4>
            <p style={{ fontSize: '14px', color: '#334155', marginBottom: '12px' }}>
              Esta ação é irreversível. Para confirmar a exclusão do produto, digite o nome exato do produto abaixo:
            </p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', userSelect: 'all' }}>
              {produtoExcluindo.nome}
            </p>

            <input
              type="text"
              placeholder="Digite o nome exato para confirmar..."
              value={confirmacaoExclusaoNome}
              onChange={(e) => setConfirmacaoExclusaoNome(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '14px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setProdutoExcluindo(null)}
                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={confirmacaoExclusaoNome !== produtoExcluindo.nome || processandoAcao}
                style={{
                  padding: '8px 16px',
                  backgroundColor: confirmacaoExclusaoNome === produtoExcluindo.nome ? '#ef4444' : '#fca5a5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: confirmacaoExclusaoNome === produtoExcluindo.nome && !processandoAcao ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                }}
              >
                {processandoAcao ? 'Excluindo...' : 'Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}