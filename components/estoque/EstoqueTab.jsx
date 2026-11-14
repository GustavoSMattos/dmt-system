'use client';

import { useState, useEffect } from 'react';

export default function EstoqueTab() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Estados para Modal de Edição
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({ nome: '', categoria: '', estoque_minimo: '0' });

  // Estados para Modal de Exclusão com Validação de Nome
  const [produtoExcluindo, setProdutoExcluindo] = useState(null);
  const [confirmacaoNome, setConfirmacaoNome] = useState('');
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
  const categoriasUnicas = Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean)));

  // Filtro composto: por Busca Textual + Dropdown de Categoria
  const produtosFiltrados = produtos.filter((p) => {
    const bateTexto =
      p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busca.toLowerCase());
    const bateCategoria = categoriaFiltro ? p.categoria === categoriaFiltro : true;
    return bateTexto && bateCategoria;
  });

  // Abrir Modal de Edição
  const handleAbrirEdicao = (prod) => {
    setProdutoEditando(prod);
    setFormEdit({
      nome: prod.nome,
      categoria: prod.categoria,
      estoque_minimo: prod.estoque_minimo || '0',
    });
  };

  // Salvar Edição
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
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
    setConfirmacaoNome('');
  };

  // Confirmar Exclusão
  const handleConfirmarExclusao = async () => {
    if (confirmacaoNome !== produtoExcluindo.nome) return;

    setProcessandoAcao(true);
    try {
      const res = await fetch(`/api/produtos?id=${produtoExcluindo.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir produto.');

      setProdutoExcluindo(null);
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

      {/* Barra de Filtros: Busca Livre + Filtro de Categoria */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por nome ou código (SKU)..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ flex: 2, padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
        />

        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
        >
          <option value="">Todas as Categorias</option>
          {categoriasUnicas.map((cat, idx) => (
            <option key={idx} value={cat}>
              {cat}
            </option>
          ))}
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
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '13px' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Código</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Nome do Produto</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Categoria</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Qtd Atual</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Estoque Mín.</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Valor Unit.</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              produtosFiltrados.map((item) => {
                const abaixoDoMinimo = Number(item.quantidade) <= Number(item.estoque_minimo || 0);
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
                    <td style={{ padding: '12px', fontSize: '14px', color: '#334155' }}>
                      R$ {Number(item.valor_unitario || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
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
      )}

      {/* MODAL DE EDIÇÃO */}
      {produtoEditando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '400px' }}>
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

              <div style={{ marginBottom: '20px' }}>
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
                  disabled={processandoAcao}
                  style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {processandoAcao ? 'Salvar...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO COM VALIDAÇÃO POR NOME */}
      {produtoExcluindo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '450px' }}>
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
              value={confirmacaoNome}
              onChange={(e) => setConfirmacaoNome(e.target.value)}
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
                disabled={confirmacaoNome !== produtoExcluindo.nome || processandoAcao}
                style={{
                  padding: '8px 16px',
                  backgroundColor: confirmacaoNome === produtoExcluindo.nome ? '#ef4444' : '#fca5a5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: confirmacaoNome === produtoExcluindo.nome && !processandoAcao ? 'pointer' : 'not-allowed',
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