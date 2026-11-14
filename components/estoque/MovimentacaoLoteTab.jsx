'use client';

import { useState, useEffect } from 'react';

export default function MovimentacaoLoteTab() {
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [itens, setItens] = useState([{ codigo: '', quantidade: 1, tipo: 'ENTRADA' }]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    // Carrega os SKUs válidos cadastrados no Supabase
    fetch('/api/produtos')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProdutosDisponiveis(data);
          // Preenche a primeira linha com o código do primeiro produto
          setItens([{ codigo: data[0].codigo, quantidade: 1, tipo: 'ENTRADA' }]);
        }
      })
      .catch(() => {});
  }, []);

  const handleAddItem = () => {
    const primeiroCodigo = produtosDisponiveis.length > 0 ? produtosDisponiveis[0].codigo : '';
    setItens([...itens, { codigo: primeiroCodigo, quantidade: 1, tipo: 'ENTRADA' }]);
  };

  const handleRemoveItem = (index) => {
    const novosItens = itens.filter((_, i) => i !== index);
    setItens(novosItens.length > 0 ? novosItens : [{ codigo: produtosDisponiveis[0]?.codigo || '', quantidade: 1, tipo: 'ENTRADA' }]);
  };

  const handleChange = (index, field, value) => {
    const novosItens = [...itens];
    novosItens[index][field] = value;
    setItens(novosItens);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const res = await fetch('/api/estoque/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens, origem: 'LOTE' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar movimentação.');

      setMensagem({ tipo: 'sucesso', texto: data.message });
      setItens([{ codigo: produtosDisponiveis[0]?.codigo || '', quantidade: 1, tipo: 'ENTRADA' }]);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>Movimentação de Estoque em Lote</h3>
      <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
        Selecione os produtos cadastrados no sistema e a quantidade para entrada/saída.
      </p>

      {mensagem.texto && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          backgroundColor: mensagem.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
          color: mensagem.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
          fontSize: '14px'
        }}>
          {mensagem.texto}
        </div>
      )}

      {produtosDisponiveis.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Nenhum produto cadastrado no banco. Cadastre produtos primeiro.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {itens.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
              <select
                value={item.codigo}
                onChange={(e) => handleChange(index, 'codigo', e.target.value)}
                required
                style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                {produtosDisponiveis.map((prod) => (
                  <option key={prod.id} value={prod.codigo}>
                    {prod.codigo} - {prod.nome} (Atual: {prod.quantidade} {prod.unidade})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Quantidade"
                value={item.quantidade}
                onChange={(e) => handleChange(index, 'quantidade', e.target.value)}
                required
                style={{ width: '130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />

              <select
                value={item.tipo}
                onChange={(e) => handleChange(index, 'tipo', e.target.value)}
                style={{ width: '130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="ENTRADA">ENTRADA</option>
                <option value="SAIDA">SAÍDA</option>
              </select>

              {itens.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  style={{ padding: '10px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  X
                </button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={handleAddItem}
              style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
            >
              + Adicionar Item
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 24px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Processando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}