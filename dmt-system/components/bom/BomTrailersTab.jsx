'use client';

import { useState, useEffect } from 'react';

export default function BomTrailersTab() {
  const [boms, setBoms] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Filtros e Expansão
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [bomExpandidaId, setBomExpandidaId] = useState(null);

  // Formulário de Criação / Edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [bomEditandoId, setBomEditandoId] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    descricao: '',
  });
  const [componentesForm, setComponentesForm] = useState([{ id_produto: '', quantidade_necessaria: 1 }]);

  // Modal de Confirmação para Iniciar Edição
  const [bomParaConfirmarEdicao, setBomParaConfirmarEdicao] = useState(null);
  const [nomeDigitadoConfirmacao, setNomeDigitadoConfirmacao] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resBoms, resProds] = await Promise.all([
        fetch('/api/trailers'),
        fetch('/api/produtos'),
      ]);

      const dataBoms = await resBoms.json();
      const dataProds = await resProds.json();

      if (resBoms.ok) setBoms(Array.isArray(dataBoms) ? dataBoms : []);
      if (resProds.ok) {
        const listaProds = Array.isArray(dataProds) ? dataProds : [];
        setProdutosDisponiveis(listaProds);
        if (listaProds.length > 0 && componentesForm[0].id_produto === '') {
          setComponentesForm([{ id_produto: listaProds[0].id, quantidade_necessaria: 1 }]);
        }
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados de BOM e produtos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Extrai apenas as categorias únicas já cadastradas nas BOMs
  const categoriasCadastradas = Array.from(new Set(boms.map((b) => b.categoria).filter(Boolean))).sort();

  // Filtra as BOMs pela categoria selecionada e pelo texto
  const bomsFiltradas = boms.filter((bom) => {
    const bateCategoria = categoriaFiltro ? bom.categoria === categoriaFiltro : true;
    const bateNome = bom.nome?.toLowerCase().includes(buscaTexto.toLowerCase());
    return bateCategoria && bateNome;
  });

  // Manipulação dos itens no formulário
  const handleAddComponente = () => {
    const primeiroId = produtosDisponiveis.length > 0 ? produtosDisponiveis[0].id : '';
    setComponentesForm([...componentesForm, { id_produto: primeiroId, quantidade_necessaria: 1 }]);
  };

  const handleRemoveComponente = (index) => {
    const novaLista = componentesForm.filter((_, i) => i !== index);
    setComponentesForm(novaLista.length > 0 ? novaLista : [{ id_produto: produtosDisponiveis[0]?.id || '', quantidade_necessaria: 1 }]);
  };

  const handleComponenteChange = (index, field, value) => {
    const novaLista = [...componentesForm];
    novaLista[index][field] = value;
    setComponentesForm(novaLista);
  };

  // Salvar Nova BOM ou Atualizar BOM Editada
  const handleSalvarBom = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const metodo = modoEdicao ? 'PUT' : 'POST';
      const payload = {
        ...(modoEdicao && { id: bomEditandoId }),
        nome: form.nome,
        categoria: form.categoria.trim(),
        descricao: form.descricao,
        componentes: componentesForm,
      };

      const res = await fetch('/api/trailers', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar estrutura BOM.');

      setMensagem({
        tipo: 'sucesso',
        texto: modoEdicao ? `BOM "${data.nome}" atualizada com sucesso!` : `BOM "${data.nome}" cadastrada com sucesso!`,
      });

      cancelarEdicao();
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  // Inicia o fluxo de segurança para editar
  const solicitarConfirmacaoEdicao = (bom) => {
    setBomParaConfirmarEdicao(bom);
    setNomeDigitadoConfirmacao('');
  };

  // Libera o formulário em modo de edição após digitar o nome exato
  const confirmarEAbrirEdicao = () => {
    if (!bomParaConfirmarEdicao || nomeDigitadoConfirmacao !== bomParaConfirmarEdicao.nome) return;

    const bom = bomParaConfirmarEdicao;
    setModoEdicao(true);
    setBomEditandoId(bom.id);
    setForm({
      nome: bom.nome,
      categoria: bom.categoria,
      descricao: bom.descricao || '',
    });

    const itensMapeados = (bom.trailer_componentes || []).map((tc) => ({
      id_produto: tc.id_produto,
      quantidade_necessaria: tc.quantidade_necessaria,
    }));

    setComponentesForm(
      itensMapeados.length > 0
        ? itensMapeados
        : [{ id_produto: produtosDisponiveis[0]?.id || '', quantidade_necessaria: 1 }]
    );

    setBomParaConfirmarEdicao(null);
    setNomeDigitadoConfirmacao('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setBomEditandoId(null);
    setForm({ nome: '', categoria: '', descricao: '' });
    setComponentesForm([{ id_produto: produtosDisponiveis[0]?.id || '', quantidade_necessaria: 1 }]);
  };

  // Exporta a BOM completa para arquivo .CSV
  const handleBaixarCSV = (bom) => {
    const linhas = [
      ['BOM', 'Categoria', 'Descricao', 'Codigo_SKU', 'Produto', 'Unidade', 'Qtd_Necessaria', 'Valor_Unitario', 'Subtotal'],
    ];

    (bom.trailer_componentes || []).forEach((item) => {
      const prod = item.produtos || {};
      const qtd = Number(item.quantidade_necessaria || 0);
      const valUnit = Number(prod.valor_unitario || 0);
      const subtotal = (qtd * valUnit).toFixed(2);

      linhas.push([
        `"${bom.nome}"`,
        `"${bom.categoria}"`,
        `"${(bom.descricao || '').replace(/"/g, '""')}"`,
        `"${prod.codigo || ''}"`,
        `"${prod.nome || ''}"`,
        `"${prod.unidade || ''}"`,
        qtd.toString().replace('.', ','),
        valUnit.toFixed(2).replace('.', ','),
        subtotal.replace('.', ','),
      ]);
    });

    // Adiciona o BOM UTF-8 (\uFEFF) para garantir acentuação correta no Excel
    const csvContent = '\uFEFF' + linhas.map((e) => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BOM_${bom.nome.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO DE BOM */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: modoEdicao ? '2px solid #0284c7' : '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: '#0f172a', margin: 0 }}>
            {modoEdicao ? `Editando Estrutura BOM: ${form.nome}` : 'Cadastrar Nova Estrutura BOM'}
          </h3>
          {modoEdicao && (
            <button
              type="button"
              onClick={cancelarEdicao}
              style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancelar Edição
            </button>
          )}
        </div>
        <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
          Defina o nome, a categoria (digite uma nova ou escolha existente) e os componentes necessários para a montagem.
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

        <form onSubmit={handleSalvarBom}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Nome da BOM *
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Trailer Modelo Standard 2 Eixos"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Categoria da BOM *
              </label>
              <input
                type="text"
                list="categorias-bom-list"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Digite ou selecione uma categoria..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <datalist id="categorias-bom-list">
                {categoriasCadastradas.map((cat, i) => (
                  <option key={i} value={cat} />
                ))}
              </datalist>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Descrição / Especificações Técnicas
              </label>
              <textarea
                rows="2"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Detalhes construtivos, dimensões ou observações da BOM..."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', color: '#334155', fontSize: '15px' }}>Componentes da Estrutura</h4>
          {produtosDisponiveis.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Cadastre produtos no estoque antes de montar uma BOM.</p>
          ) : (
            <div>
              {componentesForm.map((comp, index) => (
                <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center' }}>
                  <select
                    value={comp.id_produto}
                    onChange={(e) => handleComponenteChange(index, 'id_produto', e.target.value)}
                    required
                    style={{ flex: 3, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {produtosDisponiveis.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.codigo} - {prod.nome} ({prod.unidade})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={comp.quantidade_necessaria}
                    onChange={(e) => handleComponenteChange(index, 'quantidade_necessaria', e.target.value)}
                    placeholder="Qtd"
                    required
                    style={{ width: '130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />

                  {componentesForm.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponente(index)}
                      style={{ padding: '10px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      X
                    </button>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleAddComponente}
                  style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                >
                  + Adicionar Componente
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  style={{ padding: '10px 24px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer' }}
                >
                  {salvando ? 'Salvando...' : modoEdicao ? 'Salvar Alterações da BOM' : 'Cadastrar BOM'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* LISTAGEM E FILTRO DE BOMs */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginBottom: '16px', color: '#0f172a' }}>Estruturas BOM Cadastradas</h3>

        {/* Barra de Filtros: Busca por Nome + Filtro Exclusivo por Categorias Cadastradas */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Buscar BOM por nome..."
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            style={{ flex: 2, padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          />

          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
          >
            <option value="">Todas as Categorias Cadastradas</option>
            {categoriasCadastradas.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Carregando estruturas BOM...</div>
        ) : bomsFiltradas.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Nenhuma BOM encontrada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bomsFiltradas.map((bom) => {
              const estaExpandida = bomExpandidaId === bom.id;
              const itens = bom.trailer_componentes || [];
              const custoTotalBom = itens.reduce((acc, item) => {
                const val = Number(item.produtos?.valor_unitario || 0);
                return acc + val * Number(item.quantidade_necessaria || 0);
              }, 0);

              return (
                <div key={bom.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Cabeçalho do Card da BOM */}
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>{bom.nome}</span>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                          {bom.categoria}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        {itens.length} componente(s) | Custo Estimado: <strong>R$ {custoTotalBom.toFixed(2)}</strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setBomExpandidaId(estaExpandida ? null : bom.id)}
                        style={{ padding: '8px 14px', backgroundColor: estaExpandida ? '#334155' : '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                      >
                        {estaExpandida ? 'Recolher' : 'Expandir BOM'}
                      </button>

                      <button
                        type="button"
                        onClick={() => solicitarConfirmacaoEdicao(bom)}
                        style={{ padding: '8px 14px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                      >
                        Editar BOM
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBaixarCSV(bom)}
                        style={{ padding: '8px 14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                      >
                        Baixar CSV
                      </button>
                    </div>
                  </div>

                  {/* Visualização Completa Expandida */}
                  {estaExpandida && (
                    <div style={{ padding: '20px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0' }}>
                      {bom.descricao && (
                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '14px', color: '#334155' }}>
                          <strong>Descrição:</strong> {bom.descricao}
                        </div>
                      )}

                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '13px' }}>
                            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>SKU</th>
                            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Componente / Produto</th>
                            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Qtd Necessária</th>
                            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Saldo em Estoque</th>
                            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Custo Unit.</th>
                            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itens.map((item) => {
                            const prod = item.produtos || {};
                            const qtdNec = Number(item.quantidade_necessaria || 0);
                            const saldoAtual = Number(prod.quantidade || 0);
                            const faltaEstoque = saldoAtual < qtdNec;
                            const valUnit = Number(prod.valor_unitario || 0);

                            return (
                              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                                <td style={{ padding: '10px', fontFamily: 'monospace', color: '#0284c7', fontWeight: 'bold' }}>
                                  {prod.codigo}
                                </td>
                                <td style={{ padding: '10px', color: '#1e293b' }}>{prod.nome}</td>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>
                                  {qtdNec} {prod.unidade}
                                </td>
                                <td style={{ padding: '10px', fontWeight: 'bold', color: faltaEstoque ? '#dc2626' : '#16a34a' }}>
                                  {saldoAtual} {prod.unidade} {faltaEstoque && '(Insuficiente)'}
                                </td>
                                <td style={{ padding: '10px', color: '#475569' }}>R$ {valUnit.toFixed(2)}</td>
                                <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>
                                  R$ {(qtdNec * valUnit).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO PARA INICIAR EDIÇÃO DA BOM */}
      {bomParaConfirmarEdicao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '450px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Confirmar Edição da BOM</h4>
            <p style={{ fontSize: '14px', color: '#334155', marginBottom: '12px' }}>
              Para liberar a edição desta estrutura BOM, digite o nome exato abaixo:
            </p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', userSelect: 'all' }}>
              {bomParaConfirmarEdicao.nome}
            </p>

            <input
              type="text"
              placeholder="Digite o nome exato da BOM..."
              value={nomeDigitadoConfirmacao}
              onChange={(e) => setNomeDigitadoConfirmacao(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '14px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setBomParaConfirmarEdicao(null)}
                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEAbrirEdicao}
                disabled={nomeDigitadoConfirmacao !== bomParaConfirmarEdicao.nome}
                style={{
                  padding: '8px 16px',
                  backgroundColor: nomeDigitadoConfirmacao === bomParaConfirmarEdicao.nome ? '#0284c7' : '#93c5fd',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: nomeDigitadoConfirmacao === bomParaConfirmarEdicao.nome ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                }}
              >
                Iniciar Edição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}