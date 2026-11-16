'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [abaFiltro, setAbaFiltro] = useState('urgencia'); // 'urgencia' | 'atencao'

  const carregarDados = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/produtos');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar indicadores do estoque.');
      setProdutos(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Classificação dos produtos com base no estoque_minimo (> 0)
  const produtosUrgencia = [];
  const produtosAtencao = [];

  produtos.forEach((prod) => {
    const qtd = Number(prod.quantidade || 0);
    const min = Number(prod.estoque_minimo || 0);

    if (min > 0) {
      const percentualAcima = ((qtd - min) / min) * 100;
      const itemComCalculo = {
        ...prod,
        percentualAcima,
      };

      if (percentualAcima <= 10) {
        produtosUrgencia.push(itemComCalculo);
      } else if (percentualAcima > 10 && percentualAcima <= 25) {
        produtosAtencao.push(itemComCalculo);
      }
    }
  });

  // Ordena do mais crítico (menor percentual) para o maior
  produtosUrgencia.sort((a, b) => a.percentualAcima - b.percentualAcima);
  produtosAtencao.sort((a, b) => a.percentualAcima - b.percentualAcima);

  const valorTotalEstoque = produtos.reduce(
    (acc, p) => acc + Number(p.quantidade || 0) * Number(p.valor_unitario || 0),
    0
  );

  const listaExibida = abaFiltro === 'urgencia' ? produtosUrgencia : produtosAtencao;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* CARDS DE RESUMO GERAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total de SKUs Cadastrados</span>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '8px' }}>
            {loading ? '...' : produtos.length}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Valor Total em Estoque</span>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0284c7', marginTop: '8px' }}>
            {loading ? '...' : `R$ ${valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
        </div>

        <div
          onClick={() => setAbaFiltro('urgencia')}
          style={{
            backgroundColor: '#fef2f2',
            padding: '20px',
            borderRadius: '8px',
            border: abaFiltro === 'urgencia' ? '2px solid #dc2626' : '1px solid #fecaca',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: '700' }}>Produtos em Urgência (≤ 10%)</span>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626', marginTop: '8px' }}>
            {loading ? '...' : produtosUrgencia.length}
          </div>
        </div>

        <div
          onClick={() => setAbaFiltro('atencao')}
          style={{
            backgroundColor: '#fffbeb',
            padding: '20px',
            borderRadius: '8px',
            border: abaFiltro === 'atencao' ? '2px solid #d97706' : '1px solid #fde68a',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '13px', color: '#b45309', fontWeight: '700' }}>Produtos em Atenção (10,01% a 25%)</span>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706', marginTop: '8px' }}>
            {loading ? '...' : produtosAtencao.length}
          </div>
        </div>
      </div>

      {/* PAINEL DE MONITORAMENTO DE REPOSIÇÃO */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setAbaFiltro('urgencia')}
              style={{
                padding: '10px 18px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                backgroundColor: abaFiltro === 'urgencia' ? '#dc2626' : 'transparent',
                color: abaFiltro === 'urgencia' ? '#fff' : '#475569',
              }}
            >
              Produtos em Urgência ({produtosUrgencia.length})
            </button>

            <button
              type="button"
              onClick={() => setAbaFiltro('atencao')}
              style={{
                padding: '10px 18px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                backgroundColor: abaFiltro === 'atencao' ? '#d97706' : 'transparent',
                color: abaFiltro === 'atencao' ? '#fff' : '#475569',
              }}
            >
              Produtos em Atenção ({produtosAtencao.length})
            </button>
          </div>

          <button
            type="button"
            onClick={carregarDados}
            style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
          >
            Atualizar Indicadores
          </button>
        </div>

        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
          {abaFiltro === 'urgencia'
            ? 'Itens com saldo atual igual ou inferior a 10% acima do estoque mínimo configurado.'
            : 'Itens com saldo atual entre 10,01% e 25% acima do estoque mínimo configurado.'}
        </p>

        {erro && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
            {erro}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Analisando níveis de estoque...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '13px' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Código / SKU</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Produto</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Categoria</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Saldo Atual</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Estoque Mínimo</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Margem Acima do Mín.</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Fornecedor</th>
                </tr>
              </thead>
              <tbody>
                {listaExibida.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      {abaFiltro === 'urgencia'
                        ? 'Nenhum produto em estado de urgência no momento.'
                        : 'Nenhum produto em estado de atenção no momento.'}
                    </td>
                  </tr>
                ) : (
                  listaExibida.map((item) => {
                    const isUrgencia = abaFiltro === 'urgencia';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: '#0284c7' }}>
                          {item.codigo}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                          {item.nome}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                          {item.categoria}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: isUrgencia ? '#dc2626' : '#d97706' }}>
                          {item.quantidade} {item.unidade}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                          {item.estoque_minimo} {item.unidade}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              backgroundColor: isUrgencia ? '#fee2e2' : '#fef3c7',
                              color: isUrgencia ? '#b91c1c' : '#b45309',
                            }}
                          >
                            {item.percentualAcima >= 0
                              ? `+${item.percentualAcima.toFixed(2)}%`
                              : `${item.percentualAcima.toFixed(2)}% (Abaixo)`}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                          {item.fornecedores?.nome_empresa || '-'}
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