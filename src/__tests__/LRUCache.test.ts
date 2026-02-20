import { LRUCache } from '../utils/LRUCache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    // Criar uma nova instância do cache antes de cada teste
    cache = new LRUCache<string, number>(3); // Capacidade de 3 itens
  });

  test('deve armazenar e recuperar valores corretamente', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  test('deve remover o item menos recentemente usado quando a capacidade é excedida', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // Isso deve remover 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  test('deve atualizar a ordem de uso ao acessar um item', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Acessar 'a' para torná-lo o mais recentemente usado
    cache.get('a');

    // Adicionar um novo item deve remover 'b' (o menos recentemente usado agora)
    cache.set('d', 4);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  test('deve lidar corretamente com a expiração de itens', () => {
    jest.useFakeTimers();

    // Adicionar item com expiração de 1 minuto
    cache.set('a', 1, 1);

    // Verificar que o item existe
    expect(cache.get('a')).toBe(1);

    // Avançar o tempo em 2 minutos
    jest.advanceTimersByTime(2 * 60 * 1000);

    // O item deve ter expirado
    expect(cache.get('a')).toBeUndefined();

    jest.useRealTimers();
  });

  test('deve remover itens expirados durante a limpeza', () => {
    jest.useFakeTimers();

    // Adicionar itens com diferentes tempos de expiração
    cache.set('a', 1, 1); // 1 minuto
    cache.set('b', 2, 2); // 2 minutos
    cache.set('c', 3); // sem expiração

    // Avançar o tempo em 1.5 minutos
    jest.advanceTimersByTime(1.5 * 60 * 1000);

    // Limpar itens expirados
    const purgedCount = cache.purgeExpired();

    // Deve ter removido apenas 'a'
    expect(purgedCount).toBe(1);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);

    jest.useRealTimers();
  });

  test('deve limpar corretamente todo o cache', () => {
    cache.set('a', 1);
    cache.set('b', 2);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
