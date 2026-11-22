'use client';

import { useState, useEffect } from 'react';

export default function TrailersTab() {
  const [trailerGroups, setTrailerGroups] = useState([]);
  const [bomsDisponiveis, setBomsDisponiveis] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [buscaTexto, setBuscaTexto] = useState('');
  const [trailerExpandidoId, setTrailerExpandidoId] = useState(null);
  const [snapshotExpandidoId, setSnapshotExpandidoId] = useState(null);

  // Modal de Snapshot
  const [trailerParaSnapshot, setTrailerParaSnapshot] = useState(null);
  const [obsSnapshot, setObsSnapshot] = useState('');
  const [salvandoSnapshot, setSalvandoSnapshot] = useState(false);

  // Formulário de Cadastro / Edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [trailerEditandoId, setTrailerEditandoId] = useState(null);
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    modelo: '',
    descricao: '',
  });
  const [bomsForm, setBomsForm] = useState([
    { id_bom: '', termoBusca: '', dropdownAberto: false, quantidade: 1 },
  ]);

  const calcularCustoBom = (bom) => {
    if (!bom?.trailer_componentes) return { total: 0, produtos: 0, servicos: 0 };
    return bom.trailer_componentes.reduce(
      (acc, item) => {
        const isServ = Boolean(item.id_servico || item.servicos);
        const valUnit = Number(isServ ? item.servicos?.valor || 0 : item.produtos?.valor_unitario || 0);
        const subtotal = valUnit * Number(item.quantidade_necessaria || 0);
        acc.total += subtotal;
        if (isServ) acc.servicos += subtotal;
        else acc.produtos += subtotal;
        return acc;
      },
      { total: 0, produtos: 0, servicos: 0 }
    );
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resGroups, resBoms, resSnaps] = await Promise.all([
        fetch('/api/trailer-groups'),
        fetch('/api/trailers'),
        fetch('/api/trailer-groups/snapshots'),
      ]);

      const dataGroups = await resGroups.json();
      const dataBoms = await resBoms.json();
      const dataSnaps = await resSnaps.json();

      if (resGroups.ok) setTrailerGroups(Array.isArray(dataGroups) ? dataGroups : []);
      if (resBoms.ok) setBomsDisponiveis(Array.isArray(dataBoms) ? dataBoms : []);
      if (resSnaps.ok) setSnapshots(Array.isArray(dataSnaps) ? dataSnaps : []);
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados de Trailers e BOMs.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleAddBomLinha = () => {
    setBomsForm([...bomsForm, { id_bom: '', termoBusca: '', dropdownAberto: false, quantidade: 1 }]);
  };

  const handleRemoveBomLinha = (index) => {
    const novaLista = bomsForm.filter((_, i) => i !== index);
    setBomsForm(
      novaLista.length > 0
        ? novaLista
        : [{ id_bom: '', termoBusca: '', dropdownAberto: false, quantidade: 1 }]
    );
  };

  const handleBuscaBomChange = (index, texto) => {
    const novaLista = [...bomsForm];
    novaLista[index].termoBusca = texto;
    novaLista[index].id_bom = '';
    novaLista[index].dropdownAberto = true;
    setBomsForm(novaLista);
  };

  const handleSelecionarBom = (index, bom) => {
    const novaLista = [...bomsForm];
    novaLista[index].id_bom = bom.id;
    novaLista[index].termoBusca = `[${bom.categoria}] ${bom.nome}`;
    novaLista[index].dropdownAberto = false;
    setBomsForm(novaLista);
  };

  const handleBomFieldChange = (index, field, value) => {
    const novaLista = [...bomsForm];
    novaLista[index][field] = value;
    setBomsForm(novaLista);
  };

  const handleSalvarTrailer = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });

    const invalido = bomsForm.find((b) => !b.id_bom);
    if (invalido) {
      return setMensagem({
        tipo: 'erro',
        texto: 'Selecione uma Estrutura BOM válida da lista suspensa para todas as linhas.',
      });
    }

    const idsUnicos = new Set(bomsForm.map((b) => b.id_bom));
    if (idsUnicos.size !== bomsForm.length) {
      return setMensagem({
        tipo: 'erro',
        texto: 'Existem BOMs duplicadas na lista. Remova a duplicata e ajuste o campo de quantidade.',
      });
    }

    setSalvando(true);
    try {
      const metodo = modoEdicao ? 'PUT' : 'POST';
      const payload = {
        ...(modoEdicao && { id: trailerEditandoId }),
        codigo: form.codigo,
        nome: form.nome,
        modelo: form.modelo,
        descricao: form.descricao,
        boms: bomsForm.map((b) => ({
          id_bom: b.id_bom,
          quantidade: b.quantidade,
        })),
      };

      const res = await fetch('/api/trailer-groups', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar trailer.');

      setMensagem({
        tipo: 'sucesso',
        texto: modoEdicao
          ? `Trailer "${data.nome}" atualizado com sucesso!`
          : `Trailer "${data.nome}" cadastrado com sucesso!`,
      });

      cancelarEdicao();
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  const handleEditarTrailer = (tg) => {
    setModoEdicao(true);
    setTrailerEditandoId(tg.id);
    setForm({
      codigo: tg.codigo,
      nome: tg.nome,
      modelo: tg.modelo || '',
      descricao: tg.descricao || '',
    });

    const mapeados = (tg.trailer_group_boms || []).map((vinculo) => {
      const bom = vinculo.trailers || bomsDisponiveis.find((b) => b.id === vinculo.id_bom);
      return {
        id_bom: vinculo.id_bom,
        termoBusca: bom ? `[${bom.categoria}] ${bom.nome}` : '',
        dropdownAberto: false,
        quantidade: vinculo.quantidade,
      };
    });

    setBomsForm(
      mapeados.length > 0
        ? mapeados
        : [{ id_bom: '', termoBusca: '', dropdownAberto: false, quantidade: 1 }]
    );

    setMensagem({ tipo: '', texto: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setTrailerEditandoId(null);
    setForm({ codigo: '', nome: '', modelo: '', descricao: '' });
    setBomsForm([{ id_bom: '', termoBusca: '', dropdownAberto: false, quantidade: 1 }]);
  };

  const handleExcluirTrailer = async (tg) => {
    if (!confirm(`Deseja realmente excluir o trailer "${tg.codigo} - ${tg.nome}"?`)) return;

    try {
      const res = await fetch(`/api/trailer-groups?id=${tg.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir trailer.');

      setMensagem({ tipo: 'sucesso', texto: 'Trailer excluído com sucesso.' });
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  // Salvar Snapshot do Trailer
  const handleConfirmarSnapshot = async (e) => {
    e.preventDefault();
    if (!trailerParaSnapshot) return;

    setSalvandoSnapshot(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const res = await fetch('/api/trailer-groups/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_trailer_group: trailerParaSnapshot.id,
          observacao: obsSnapshot,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar snapshot.');

      setMensagem({
        tipo: 'sucesso',
        texto: `Snapshot de R$ ${Number(data.custo_total).toFixed(2)} salvo para "${trailerParaSnapshot.nome}"!`,
      });

      setTrailerExpandidoId(trailerParaSnapshot.id);
      setTrailerParaSnapshot(null);
      setObsSnapshot('');
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvandoSnapshot(false);
    }
  };

  const handleExcluirSnapshot = async (snapId) => {
    if (!confirm('Deseja excluir este registro de snapshot do histórico?')) return;

    try {
      const res = await fetch(`/api/trailer-groups/snapshots?id=${snapId}`, { method: 'DELETE' });
      if (res.ok) {
        setSnapshots((prev) => prev.filter((s) => s.id !== snapId));
      }
    } catch {
      // Silencia erro
    }
  };

  const agruparCustosPorCategoria = (tg) => {
    const mapaCategorias = new Map();
    let custoTotalGeral = 0;
    let totalProdutosGeral = 0;
    let totalServicosGeral = 0;

    (tg.trailer_group_boms || []).forEach((vinculo) => {
      const bom = vinculo.trailers;
      if (!bom) return;

      const cat = bom.categoria || 'Sem Categoria';
      const qtdBom = Number(vinculo.quantidade || 1);
      const custosBom = calcularCustoBom(bom);

      const subtotalBom = custosBom.total * qtdBom;
      const subtotalProdutos = custosBom.produtos * qtdBom;
      const subtotalServicos = custosBom.servicos * qtdBom;

      custoTotalGeral += subtotalBom;
      totalProdutosGeral += subtotalProdutos;
      totalServicosGeral += subtotalServicos;

      if (!mapaCategorias.has(cat)) {
        mapaCategorias.set(cat, {
          categoria: cat,
          custoTotal: 0,
          custoProdutos: 0,
          custoServicos: 0,
          boms: [],
        });
      }

      const grupo = mapaCategorias.get(cat);
      grupo.custoTotal += subtotalBom;
      grupo.custoProdutos += subtotalProdutos;
      grupo.custoServicos += subtotalServicos;
      grupo.boms.push({
        idVinculo: vinculo.id,
        nomeBom: bom.nome,
        qtdBom,
        custoUnitarioBom: custosBom.total,
        subtotalBom,
        componentes: bom.trailer_componentes || [],
      });
    });

    const categoriasOrdenadas = Array.from(mapaCategorias.values()).sort(
      (a, b) => b.custoTotal - a.custoTotal
    );

    return {
      categorias: categoriasOrdenadas,
      custoTotalGeral,
      totalProdutosGeral,
      totalServicosGeral,
    };
  };

  const handleBaixarCSV = (tg) => {
    const { categorias, custoTotalGeral } = agruparCustosPorCategoria(tg);
    const linhas = [
      [
        'Trailer_Codigo',
        'Trailer_Nome',
        'Categoria_BOM',
        'Estrutura_BOM',
        'Qtd_BOM_no_Trailer',
        'Tipo_Item',
        'Codigo_Item',
        'Nome_Item',
        'Unidade',
        'Qtd_Total_Item',
        'Custo_Unitario',
        'Custo_Total_Item',
      ],
    ];

    categorias.forEach((cat) => {
      cat.boms.forEach((b) => {
        b.componentes.forEach((comp) => {
          const isServ = Boolean(comp.id_servico || comp.servicos);
          const dados = isServ ? comp.servicos || {} : comp.produtos || {};
          const qtdTotalItem = Number(comp.quantidade_necessaria || 0) * b.qtdBom;
          const valUnit = Number(isServ ? dados.valor || 0 : dados.valor_unitario || 0);
          const totalItem = qtdTotalItem * valUnit;

          linhas.push([
            `"${tg.codigo}"`,
            `"${tg.nome}"`,
            `"${cat.categoria}"`,
            `"${b.nomeBom}"`,
            b.qtdBom.toString().replace('.', ','),
            `"${isServ ? 'SERVICO' : 'PRODUTO'}"`,
            `"${dados.codigo || ''}"`,
            `"${dados.nome || ''}"`,
            `"${dados.unidade || ''}"`,
            qtdTotalItem.toFixed(2).replace('.', ','),
            valUnit.toFixed(2).replace('.', ','),
            totalItem.toFixed(2).replace('.', ','),
          ]);
        });
      });
    });

    linhas.push(['', '', '', '', '', '', '', '', '', '', '"CUSTO TOTAL TRAILER"', custoTotalGeral.toFixed(2).replace('.', ',')]);

    const csvContent = '\uFEFF' + linhas.map((e) => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TRAILER_${tg.codigo}_${tg.nome.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const custoPrevistoFormulario = bomsForm.reduce((acc, item) => {
    if (!item.id_bom) return acc;
    const bom = bomsDisponiveis.find((b) => b.id === item.id_bom);
    if (!bom) return acc;
    return acc + calcularCustoBom(bom).total * (parseFloat(item.quantidade) || 0);
  }, 0);

  const trailersFiltrados = trailerGroups.filter(
    (tg) =>
      tg.codigo?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      tg.nome?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      tg.modelo?.toLowerCase().includes(buscaTexto.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULÁRIO DE MONTAGEM DO TRAILER (BOM DAS BOMs) */}
      <div
        style={{
          backgroundColor: '#15171c',
          padding: '24px',
          borderRadius: '12px',
          border: modoEdicao ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '18px' }}>
            {modoEdicao ? `Editando Trailer: ${form.codigo} - ${form.nome}` : 'Montar Novo Trailer (BOM das BOMs)'}
          </h3>
          {modoEdicao && (
            <button
              type="button"
              onClick={cancelarEdicao}
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
          Agrupe as Estruturas BOM (Chassi, Eixos, Elétrica, Pintura, Acabamento, etc.) para consolidar o custo total do trailer por categoria e registrar snapshots periódicos.
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

        <form onSubmit={handleSalvarTrailer}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
                Código do Trailer *
              </label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="Ex: TRL-FOOD-4M"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
                Nome do Trailer *
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Food Trailer Standard 4.0m 2 Eixos"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
                Linha / Modelo
              </label>
              <input
                type="text"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                placeholder="Ex: Linha Comercial / Gourmet"
                style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
                Descrição / Memorial Descritivo
              </label>
              <textarea
                rows="2"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Observações gerais do projeto do trailer..."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ margin: 0, color: '#e5c158', fontSize: '15px' }}>Estruturas BOM que compõem este Trailer</h4>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              Custo Estimado na Montagem:{' '}
              <strong style={{ color: '#4ade80', fontSize: '15px' }}>
                R$ {custoPrevistoFormulario.toFixed(2)}
              </strong>
            </span>
          </div>

          {bomsDisponiveis.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Cadastre Estruturas BOM na aba "Estruturas BOM" antes de montar um trailer.
            </p>
          ) : (
            <div>
              {bomsForm.map((itemForm, index) => {
                const termo = itemForm.termoBusca.trim().toLowerCase();
                const sugestoes = bomsDisponiveis.filter(
                  (b) =>
                    b.nome?.toLowerCase().includes(termo) ||
                    b.categoria?.toLowerCase().includes(termo)
                );

                return (
                  <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 3, minWidth: '280px', position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Busque uma Estrutura BOM pelo nome ou categoria..."
                        value={itemForm.termoBusca}
                        onChange={(e) => handleBuscaBomChange(index, e.target.value)}
                        onFocus={() => handleBomFieldChange(index, 'dropdownAberto', true)}
                        onBlur={() => {
                          setTimeout(() => handleBomFieldChange(index, 'dropdownAberto', false), 180);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: itemForm.id_bom ? '1px solid #d4af37' : undefined,
                          fontSize: '14px',
                        }}
                      />

                      {itemForm.dropdownAberto && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '240px',
                            overflowY: 'auto',
                            backgroundColor: '#111216',
                            border: '1px solid rgba(212, 175, 55, 0.45)',
                            borderRadius: '6px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                            zIndex: 50,
                            marginTop: '4px',
                          }}
                        >
                          {sugestoes.length === 0 ? (
                            <div style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>
                              Nenhuma Estrutura BOM encontrada.
                            </div>
                          ) : (
                            sugestoes.map((bom) => {
                              const custoUnit = calcularCustoBom(bom).total;
                              return (
                                <div
                                  key={bom.id}
                                  onMouseDown={() => handleSelecionarBom(index, bom)}
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
                                    <span
                                      style={{
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        marginRight: '8px',
                                        backgroundColor: 'rgba(212, 175, 55, 0.18)',
                                        color: '#e5c158',
                                      }}
                                    >
                                      {bom.categoria}
                                    </span>
                                    <strong>{bom.nome}</strong>
                                  </span>
                                  <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: '600', marginLeft: '8px' }}>
                                    Custo BOM: R$ {custoUnit.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>Qtd:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={itemForm.quantidade}
                        onChange={(e) => handleBomFieldChange(index, 'quantidade', e.target.value)}
                        required
                        style={{ width: '95px', padding: '10px', borderRadius: '6px' }}
                      />
                    </div>

                    {bomsForm.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBomLinha(index)}
                        style={{ padding: '10px 14px', backgroundColor: '#991b1b', color: '#fff', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        X
                      </button>
                    )}
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleAddBomLinha}
                  style={{ padding: '10px 16px', backgroundColor: '#1e2028', color: '#e5c158', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  + Adicionar Estrutura BOM
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  style={{ padding: '10px 24px', background: 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)', color: '#0c0d10', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer' }}
                >
                  {salvando ? 'Salvando...' : modoEdicao ? 'Salvar Alterações do Trailer' : 'Salvar Trailer'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* LISTAGEM DE TRAILERS, CUSTOS POR CATEGORIA E HISTÓRICO DE SNAPSHOTS */}
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
        <h3 style={{ marginBottom: '16px', color: '#f8fafc', fontSize: '18px' }}>Trailers Cadastrados</h3>

        <input
          type="text"
          placeholder="Buscar trailer por código, nome ou modelo..."
          value={buscaTexto}
          onChange={(e) => setBuscaTexto(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', marginBottom: '20px', borderRadius: '6px', fontSize: '14px' }}
        />

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Carregando trailers...</div>
        ) : trailersFiltrados.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Nenhum trailer cadastrado.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {trailersFiltrados.map((tg) => {
              const estaExpandido = trailerExpandidoId === tg.id;
              const { categorias, custoTotalGeral, totalProdutosGeral, totalServicosGeral } =
                agruparCustosPorCategoria(tg);

              const snapshotsDoTrailer = snapshots.filter((s) => s.id_trailer_group === tg.id);

              return (
                <div key={tg.id} style={{ border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '8px', overflow: 'hidden' }}>
                  {/* CABEÇALHO DO TRAILER */}
                  <div style={{ padding: '16px', backgroundColor: '#111216', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#e5c158', fontSize: '14px' }}>
                          {tg.codigo}
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#f8fafc' }}>{tg.nome}</span>
                        {tg.modelo && (
                          <span style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', color: '#e5c158', border: '1px solid rgba(212, 175, 55, 0.4)', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                            {tg.modelo}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
                        {categorias.length} categoria(s) | {(tg.trailer_group_boms || []).length} BOM(s) | {snapshotsDoTrailer.length} snapshot(s) | Custo Atual:{' '}
                        <strong style={{ color: '#4ade80', fontSize: '15px' }}>
                          R$ {custoTotalGeral.toFixed(2)}
                        </strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setTrailerParaSnapshot(tg);
                          setObsSnapshot('');
                        }}
                        style={{ padding: '8px 14px', backgroundColor: 'rgba(56, 189, 248, 0.18)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.45)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Salvar Snapshot
                      </button>

                      <button
                        type="button"
                        onClick={() => setTrailerExpandidoId(estaExpandido ? null : tg.id)}
                        style={{ padding: '8px 14px', backgroundColor: '#1e2028', color: '#f8fafc', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                      >
                        {estaExpandido ? 'Recolher Detalhes' : 'Custos & Histórico'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditarTrailer(tg)}
                        style={{ padding: '8px 14px', backgroundColor: '#d4af37', color: '#0c0d10', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBaixarCSV(tg)}
                        style={{ padding: '8px 14px', backgroundColor: 'rgba(22, 163, 74, 0.2)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.5)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Baixar CSV
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExcluirTrailer(tg)}
                        style={{ padding: '8px 12px', backgroundColor: '#991b1b', color: '#fef2f2', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {/* PAINEL EXPANDIDO: CUSTOS POR CATEGORIA + HISTÓRICO DE SNAPSHOTS */}
                  {estaExpandido && (
                    <div style={{ padding: '20px', backgroundColor: '#15171c', borderTop: '1px solid rgba(212, 175, 55, 0.25)' }}>
                      {tg.descricao && (
                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#111216', borderRadius: '6px', fontSize: '14px', color: '#d1d5db', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                          <strong style={{ color: '#e5c158' }}>Memorial Descritivo:</strong> {tg.descricao}
                        </div>
                      )}

                      {/* RESUMO GERAL: MATERIAIS vs SERVIÇOS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ backgroundColor: '#111216', padding: '14px', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Custo Atual em Produtos</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginTop: '4px' }}>
                            R$ {totalProdutosGeral.toFixed(2)}
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#111216', padding: '14px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Custo Atual em Serviços</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7dd3fc', marginTop: '4px' }}>
                            R$ {totalServicosGeral.toFixed(2)}
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#111216', padding: '14px', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.4)' }}>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Custo Total Atual do Trailer</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4ade80', marginTop: '4px' }}>
                            R$ {custoTotalGeral.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* DETALHAMENTO POR CATEGORIA */}
                      <h4 style={{ color: '#e5c158', fontSize: '15px', marginBottom: '12px' }}>
                        Custos Atuais por Categoria
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                        {categorias.map((cat) => {
                          const percentual =
                            custoTotalGeral > 0 ? ((cat.custoTotal / custoTotalGeral) * 100).toFixed(1) : '0.0';

                          return (
                            <div
                              key={cat.categoria}
                              style={{
                                backgroundColor: '#111216',
                                border: '1px solid rgba(212, 175, 55, 0.25)',
                                borderRadius: '8px',
                                padding: '16px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>
                                    {cat.categoria}
                                  </span>
                                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(212, 175, 55, 0.15)', color: '#e5c158' }}>
                                    {percentual}% do custo total
                                  </span>
                                </div>

                                <div style={{ fontSize: '14px', color: '#d1d5db' }}>
                                  Prod: <strong style={{ color: '#e5c158' }}>R$ {cat.custoProdutos.toFixed(2)}</strong> | Serv:{' '}
                                  <strong style={{ color: '#7dd3fc' }}>R$ {cat.custoServicos.toFixed(2)}</strong> | Subtotal Categoria:{' '}
                                  <strong style={{ color: '#4ade80', fontSize: '16px' }}>R$ {cat.custoTotal.toFixed(2)}</strong>
                                </div>
                              </div>

                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ color: '#d4af37', borderBottom: '1px solid rgba(212, 175, 55, 0.25)' }}>
                                    <th style={{ padding: '8px' }}>Estrutura BOM</th>
                                    <th style={{ padding: '8px' }}>Qtd no Trailer</th>
                                    <th style={{ padding: '8px' }}>Custo Unit. da BOM</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal na Categoria</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cat.boms.map((b) => (
                                    <tr key={b.idVinculo} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                      <td style={{ padding: '8px', color: '#f8fafc', fontWeight: '500' }}>{b.nomeBom}</td>
                                      <td style={{ padding: '8px', color: '#d1d5db' }}>{b.qtdBom}x</td>
                                      <td style={{ padding: '8px', color: '#9ca3af' }}>R$ {b.custoUnitarioBom.toFixed(2)}</td>
                                      <td style={{ padding: '8px', color: '#e5c158', fontWeight: 'bold', textAlign: 'right' }}>
                                        R$ {b.subtotalBom.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>

                      {/* HISTÓRICO DE SNAPSHOTS DE CUSTO */}
                      <div style={{ backgroundColor: '#111216', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <h4 style={{ margin: 0, color: '#7dd3fc', fontSize: '15px' }}>
                            Histórico de Snapshots de Custo ({snapshotsDoTrailer.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setTrailerParaSnapshot(tg);
                              setObsSnapshot('');
                            }}
                            style={{ padding: '6px 12px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            + Novo Snapshot Agora
                          </button>
                        </div>

                        {snapshotsDoTrailer.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                            Nenhum snapshot salvo ainda para este trailer. Clique em "Salvar Snapshot" para registrar o custo atual como marco histórico.
                          </p>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                              <thead>
                                <tr style={{ color: '#7dd3fc', borderBottom: '1px solid rgba(56, 189, 248, 0.25)' }}>
                                  <th style={{ padding: '8px' }}>Data / Hora</th>
                                  <th style={{ padding: '8px' }}>Observação / Marco</th>
                                  <th style={{ padding: '8px' }}>Produtos</th>
                                  <th style={{ padding: '8px' }}>Serviços</th>
                                  <th style={{ padding: '8px' }}>Custo Total</th>
                                  <th style={{ padding: '8px' }}>Variação vs. Anterior</th>
                                  <th style={{ padding: '8px', textAlign: 'center' }}>Detalhes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {snapshotsDoTrailer.map((snap, idx) => {
                                  const snapAnterior = snapshotsDoTrailer[idx + 1];
                                  const totalAtual = Number(snap.custo_total || 0);
                                  const totalAnt = snapAnterior ? Number(snapAnterior.custo_total || 0) : null;
                                  const diff = totalAnt !== null ? totalAtual - totalAnt : null;
                                  const diffPerc = totalAnt && totalAnt > 0 ? ((diff / totalAnt) * 100).toFixed(1) : null;
                                  const snapAberto = snapshotExpandidoId === snap.id;

                                  return (
                                    <>
                                      <tr key={snap.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <td style={{ padding: '8px', color: '#d1d5db', whiteSpace: 'nowrap' }}>
                                          {new Date(snap.criado_em).toLocaleString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '8px', color: '#f8fafc' }}>
                                          {snap.observacao || <span style={{ color: '#6b7280' }}>Registro periódico</span>}
                                        </td>
                                        <td style={{ padding: '8px', color: '#e5c158' }}>
                                          R$ {Number(snap.custo_produtos || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px', color: '#7dd3fc' }}>
                                          R$ {Number(snap.custo_servicos || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#4ade80' }}>
                                          R$ {totalAtual.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px', fontSize: '12px', fontWeight: '600' }}>
                                          {diff === null ? (
                                            <span style={{ color: '#6b7280' }}>Base inicial</span>
                                          ) : diff === 0 ? (
                                            <span style={{ color: '#9ca3af' }}>Sem alteração (0%)</span>
                                          ) : diff > 0 ? (
                                            <span style={{ color: '#f87171' }}>
                                              +R$ {diff.toFixed(2)} ({diffPerc ? `+${diffPerc}%` : ''})
                                            </span>
                                          ) : (
                                            <span style={{ color: '#4ade80' }}>
                                              -R$ {Math.abs(diff).toFixed(2)} ({diffPerc ? `${diffPerc}%` : ''})
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                          <button
                                            type="button"
                                            onClick={() => setSnapshotExpandidoId(snapAberto ? null : snap.id)}
                                            style={{ padding: '4px 8px', marginRight: '6px', backgroundColor: '#1e2028', color: '#e5c158', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                                          >
                                            {snapAberto ? 'Ocultar' : 'Categorias'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleExcluirSnapshot(snap.id)}
                                            style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                                          >
                                            X
                                          </button>
                                        </td>
                                      </tr>

                                      {snapAberto && Array.isArray(snap.detalhes_categorias) && (
                                        <tr style={{ backgroundColor: '#0c0d10' }}>
                                          <td colSpan="7" style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                                              Composição congelada por categoria em {new Date(snap.criado_em).toLocaleDateString('pt-BR')}:
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                              {snap.detalhes_categorias.map((c, i) => (
                                                <div key={i} style={{ padding: '8px 12px', backgroundColor: '#15171c', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '6px', fontSize: '12px' }}>
                                                  <strong style={{ color: '#e5c158' }}>{c.categoria}:</strong>{' '}
                                                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>R$ {Number(c.custo_total).toFixed(2)}</span>{' '}
                                                  <span style={{ color: '#9ca3af' }}>
                                                    (Prod: R$ {Number(c.custo_produtos).toFixed(2)} | Serv: R$ {Number(c.custo_servicos).toFixed(2)})
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA SALVAR SNAPSHOT */}
      {trailerParaSnapshot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#15171c', border: '1px solid rgba(56, 189, 248, 0.5)', padding: '24px', borderRadius: '10px', width: '100%', maxWidth: '460px', color: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#7dd3fc' }}>Salvar Snapshot de Custo</h4>
            <p style={{ fontSize: '13px', color: '#d1d5db', marginBottom: '16px' }}>
              Congela o custo atual de todos os produtos, serviços e categorias do trailer{' '}
              <strong style={{ color: '#e5c158' }}>{trailerParaSnapshot.codigo} - {trailerParaSnapshot.nome}</strong> para histórico e comparação futura.
            </p>

            <form onSubmit={handleConfirmarSnapshot}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
                Observação / Referência (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Tabela Novembro/2026 - Pré-reajuste aço"
                value={obsSnapshot}
                onChange={(e) => setObsSnapshot(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTrailerParaSnapshot(null)}
                  style={{ padding: '8px 16px', backgroundColor: '#1e2028', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoSnapshot}
                  style={{ padding: '8px 18px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: salvandoSnapshot ? 'not-allowed' : 'pointer' }}
                >
                  {salvandoSnapshot ? 'Gravando...' : 'Confirmar Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}