import { apiFetch } from './api';

export const estoqueService = {
  async listarProdutos() {
    return await apiFetch('/api/produtos');
  },

  async cadastrarProduto(produtoData) {
    return await apiFetch('/api/produtos', {
      method: 'POST',
      body: JSON.stringify(produtoData),
    });
  },

  async movimentarLote(itens, origem = 'LOTE') {
    return await apiFetch('/api/estoque/lote', {
      method: 'POST',
      body: JSON.stringify({ itens, origem }),
    });
  },
};