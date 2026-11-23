'use client';

import { useState, useEffect } from 'react';

export default function EstoqueTab() {
  const [produtos, setProdutos] = useState([]);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Modal de Edição
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resProd, resMe] = await Promise.all([
        fetch('/api/produtos', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
      ]);

      const dataProd = await resProd.json();
      if (!resProd.ok) throw new Error(dataProd.error || 'Erro ao carregar produtos.');
      setProdutos(Array.isArray(dataProd) ? dataProd : []);

      if (resMe.ok) {
        const dataMe = await resMe.json();
        setPerfilUsuario(String(dataMe?.perfil || '').toLowerCase());
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const podeEditarOuExcluir = ['admin', 'operador'].includes(perfilUsuario);
  const isAdmin = perfilUsuario === 'admin';

  const handleExcluir = async (prod) => {
    if (!confirm(`Deseja realmente excluir o produto "${prod.codigo} - ${prod.nome}"?`)) return;

    setMensagem({ tipo: '', texto: '' });
    try {
      const res = await fetch(`/api/produtos?id=${prod.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir produto.');

      setMensagem({ tipo: 'sucesso', texto: `Produto "${prod.nome}" excluído com sucesso.` });
      setProdutos((prev) => prev.filter((item) => item.id !== prod.id));
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!produtoEditando) return;

    setSalvandoEdicao(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const res = await fetch('/api/produtos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produtoEditando),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar produto.');

      setMensagem({ tipo: 'sucesso', texto: `Produto "${data.nome}" atualizado com sucesso.` });
      setProdutoEditando(null);
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const categorias = Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean))).sort();

  const produtosFiltrados = produtos.filter((p) => {
    const bateBusca =
      p.codigo?.toLowerCase().includes(busca.toLowerCase()) ||
      p.nome?.toLowerCase().includes(busca.toLowerCase());
    const bateCategoria = categoriaFiltro ? p.categoria === categoriaFiltro : true;
    return bateBusca && bateCategoria;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>
            Estoque de Produtos ({produtosFiltrados.length})
          </h3>
          <button
            onClick={carregarDados}
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

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por código (SKU) ou nome do produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ flex: 2, minWidth: '240px', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }}
          />
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={{ flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="">Todas as Categorias</option>
            {categorias.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Carregando estoque...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ backgroundColor: '#111216', color: '#d4af37', fontSize: '13px' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Código</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Produto</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Categoria</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Saldo</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Mínimo</th>
                  {isAdmin && (
                    <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Valor Unit.</th>
                  )}
                  {podeEditarOuExcluir && (
                    <th style={{ padding: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)', textAlign: 'center' }}>
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((item) => {
                    const saldoBaixo = Number(item.estoque_minimo || 0) > 0 && Number(item.quantidade || 0) <= Number(item.estoque_minimo || 0);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.12)' }}>
                        <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: '#e5c158' }}>
                          {item.codigo}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#f8fafc', fontWeight: '500' }}>
                          {item.nome}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#9ca3af' }}>
                          {item.categoria || '-'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: saldoBaixo ? '#f87171' : '#4ade80' }}>
                          {item.quantidade} {item.unidade}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#9ca3af' }}>
                          {item.estoque_minimo || 0} {item.unidade}
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '12px', fontSize: '14px', color: '#e5c158' }}>
                            R$ {Number(item.valor_unitario || 0).toFixed(2)}
                          </td>
                        )}
                        {podeEditarOuExcluir && (
                          <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => setProdutoEditando({ ...item })}
                              style={{ padding: '6px 12px', marginRight: '6px', backgroundColor: '#d4af37', color: '#0c0d10', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluir(item)}
                              style={{ padding: '6px 12px', backgroundColor: '#991b1b', color: '#fef2f2', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                            >
                              Excluir
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DE PRODUTO */}
      {produtoEditando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#15171c', border: '1px solid rgba(212, 175, 55, 0.5)', padding: '24px', borderRadius: '10px', width: '100%', maxWidth: '500px', color: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#e5c158' }}>Editar Produto</h4>
            <form onSubmit={handleSalvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#d1d5db' }}>Código *</label>
                <input
                  type="text"
                  value={produtoEditando.codigo}
                  onChange={(e) => setProdutoEditando({ ...produtoEditando, codigo: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#d1d5db' }}>Nome *</label>
                <input
                  type="text"
                  value={produtoEditando.nome}
                  onChange={(e) => setProdutoEditando({ ...produtoEditando, nome: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#d1d5db' }}>Categoria</label>
                  <input
                    type="text"
                    value={produtoEditando.categoria || ''}
                    onChange={(e) => setProdutoEditando({ ...produtoEditando, categoria: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#d1d5db' }}>Unidade</label>
                  <input
                    type="text"
                    value={produtoEditando.unidade || 'UN'}
                    onChange={(e) => setProdutoEditando({ ...produtoEditando, unidade: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#d1d5db' }}>Saldo Atual</label>
                  <input
                    type="number"
                    step="0.01"
                    value={produtoEditando.quantidade}
                    onChange={(e) => setProdutoEditando({ ...produtoEditando, quantidade: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#d1d5db' }}>Estoque Mínimo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={produtoEditando.estoque_minimo || 0}
                    onChange={(e) => setProdutoEditando({ ...produtoEditando, estoque_minimo: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px' }}
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#d1d5db' }}>Valor Unit. (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={produtoEditando.valor_unitario || 0}
                      onChange={(e) => setProdutoEditando({ ...produtoEditando, valor_unitario: e.target.value })}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setProdutoEditando(null)}
                  style={{ padding: '8px 16px', backgroundColor: '#1e2028', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  style={{ padding: '8px 18px', backgroundColor: '#d4af37', color: '#0c0d10', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}