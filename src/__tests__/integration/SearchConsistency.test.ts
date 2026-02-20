import { SearchService } from '../../services/SearchService';

describe('Busca de produtos consistente em ambientes de teste', () => {
  it('retorna "Bolo de Chocolate" ao buscar por chocolate', async () => {
    const service = SearchService.getInstance();
    const resultado = await service.buscarProdutos('chocolate');
    const nomes = resultado.produtos.map(p => p.nome.toLowerCase());
    expect(nomes.some(n => n.includes('bolo de chocolate'))).toBe(true);
    expect(resultado.total).toBeGreaterThan(0);
  });
});
