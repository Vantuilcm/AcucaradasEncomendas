/**
 * Sistema de Fidelidade Inteligente
 *
 * Este algoritmo implementa um sistema de fidelidade que personaliza recompensas e benefícios
 * com base no comportamento e valor do cliente, utilizando análise de padrões de compra,
 * recorrência e preferências.
 *
 * Complexidade Temporal:
 * - Cálculo de pontos: O(n) onde n é o número de compras do cliente
 * - Determinação de nível: O(1) operação constante
 * - Geração de recomendações: O(m log m) onde m é o número de recompensas disponíveis
 *
 * Complexidade Espacial: O(n + m) para armazenar dados de clientes e recompensas
 */

class SistemaFidelidadeInteligente {
  constructor() {
    // Configurações do sistema de pontos
    this.configuracoes = {
      // Multiplicadores de pontos por valor de compra
      multiplicadorValor: 1.0, // 1 ponto por real gasto

      // Multiplicadores por recorrência
      multiplicadorRecorrencia: {
        baixa: 1.0, // menos de 1 compra por mês
        media: 1.2, // 1-2 compras por mês
        alta: 1.5, // 3+ compras por mês
      },

      // Multiplicadores por categoria de produto
      multiplicadorCategoria: {
        padrao: 1.0,
        promocao: 0.8,
        premium: 1.3,
        exclusivo: 1.5,
      },

      // Multiplicadores sazonais
      multiplicadorSazonal: {
        normal: 1.0,
        especial: 1.2, // datas comemorativas
        aniversario: 2.0, // aniversário do cliente
      },

      // Níveis de fidelidade
      niveis: [
        { nome: 'Bronze', pontosMinimosMensais: 0, pontosMinimosSemestrais: 0 },
        { nome: 'Prata', pontosMinimosMensais: 100, pontosMinimosSemestrais: 500 },
        { nome: 'Ouro', pontosMinimosMensais: 300, pontosMinimosSemestrais: 1500 },
        { nome: 'Diamante', pontosMinimosMensais: 500, pontosMinimosSemestrais: 3000 },
      ],

      // Validade dos pontos em dias
      validadePontos: 180, // 6 meses

      // Limite de pontos por transação
      limitePontosPorTransacao: 1000,
    };

    // Catálogo de recompensas disponíveis
    this.catalogoRecompensas = [
      {
        id: 'desconto-10',
        nome: 'Desconto de 10%',
        descricao: 'Desconto de 10% na próxima compra',
        pontosNecessarios: 100,
        tipo: 'desconto',
        valor: 10,
        niveisElegiveis: ['Bronze', 'Prata', 'Ouro', 'Diamante'],
        categorias: ['todas'],
      },
      {
        id: 'desconto-15',
        nome: 'Desconto de 15%',
        descricao: 'Desconto de 15% na próxima compra',
        pontosNecessarios: 200,
        tipo: 'desconto',
        valor: 15,
        niveisElegiveis: ['Prata', 'Ouro', 'Diamante'],
        categorias: ['todas'],
      },
      {
        id: 'desconto-20',
        nome: 'Desconto de 20%',
        descricao: 'Desconto de 20% na próxima compra',
        pontosNecessarios: 300,
        tipo: 'desconto',
        valor: 20,
        niveisElegiveis: ['Ouro', 'Diamante'],
        categorias: ['todas'],
      },
      {
        id: 'frete-gratis',
        nome: 'Frete Grátis',
        descricao: 'Frete grátis na próxima compra',
        pontosNecessarios: 150,
        tipo: 'frete',
        valor: 100,
        niveisElegiveis: ['Bronze', 'Prata', 'Ouro', 'Diamante'],
        categorias: ['todas'],
      },
      {
        id: 'produto-gratis',
        nome: 'Produto Grátis',
        descricao: 'Um produto grátis na próxima compra (até R$30)',
        pontosNecessarios: 400,
        tipo: 'produto',
        valor: 30,
        niveisElegiveis: ['Ouro', 'Diamante'],
        categorias: ['todas'],
      },
      {
        id: 'entrega-prioritaria',
        nome: 'Entrega Prioritária',
        descricao: 'Sua encomenda terá prioridade máxima na fila de produção e entrega',
        pontosNecessarios: 250,
        tipo: 'servico',
        valor: 0,
        niveisElegiveis: ['Prata', 'Ouro', 'Diamante'],
        categorias: ['todas'],
      },
      {
        id: 'workshop-confeitaria',
        nome: 'Workshop de Confeitaria',
        descricao: 'Participação em um workshop exclusivo com nossos confeiteiros',
        pontosNecessarios: 800,
        tipo: 'experiencia',
        valor: 0,
        niveisElegiveis: ['Diamante'],
        categorias: ['todas'],
      },
      {
        id: 'personalizacao-especial',
        nome: 'Personalização Especial',
        descricao: 'Personalização especial em seu próximo bolo ou doce',
        pontosNecessarios: 350,
        tipo: 'servico',
        valor: 0,
        niveisElegiveis: ['Ouro', 'Diamante'],
        categorias: ['bolos', 'doces'],
      },
    ];
  }

  /**
   * Calcula os pontos para uma compra específica
   * @param {Object} compra - Dados da compra
   * @param {Object} cliente - Dados do cliente
   * @returns {number} - Pontos ganhos na compra
   */
  calcularPontos(compra, cliente) {
    // Valor base de pontos (1 ponto por real gasto)
    let pontos = compra.valorTotal * this.configuracoes.multiplicadorValor;

    // Aplicar multiplicador de recorrência
    const recorrencia = this.determinarRecorrencia(cliente);
    pontos *= this.configuracoes.multiplicadorRecorrencia[recorrencia];

    // Aplicar multiplicador de categoria
    // Se a compra tiver múltiplas categorias, usamos a média dos multiplicadores
    if (compra.categorias && compra.categorias.length > 0) {
      let multiplicadorTotal = 0;
      compra.categorias.forEach(categoria => {
        multiplicadorTotal +=
          this.configuracoes.multiplicadorCategoria[categoria] ||
          this.configuracoes.multiplicadorCategoria.padrao;
      });
      pontos *= multiplicadorTotal / compra.categorias.length;
    }

    // Aplicar multiplicador sazonal
    const tipoData = this.verificarDataEspecial(compra.data, cliente.dataNascimento);
    pontos *= this.configuracoes.multiplicadorSazonal[tipoData];

    // Arredondar para o inteiro mais próximo e aplicar limite
    pontos = Math.round(pontos);
    return Math.min(pontos, this.configuracoes.limitePontosPorTransacao);
  }

  /**
   * Determina o nível de recorrência do cliente
   * @param {Object} cliente - Dados do cliente
   * @returns {string} - Nível de recorrência (baixa, media, alta)
   */
  determinarRecorrencia(cliente) {
    // Calcular número de compras nos últimos 30 dias
    const hoje = new Date();
    const umMesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());

    const comprasUltimoMes = cliente.historicoCompras.filter(compra => {
      const dataCompra = new Date(compra.data);
      return dataCompra >= umMesAtras && dataCompra <= hoje;
    }).length;

    if (comprasUltimoMes >= 3) return 'alta';
    if (comprasUltimoMes >= 1) return 'media';
    return 'baixa';
  }

  /**
   * Verifica se a data da compra é especial
   * @param {string} dataCompra - Data da compra
   * @param {string} dataNascimento - Data de nascimento do cliente
   * @returns {string} - Tipo de data (normal, especial, aniversario)
   */
  verificarDataEspecial(dataCompra, dataNascimento) {
    const data = new Date(dataCompra);

    // Verificar se é aniversário do cliente
    if (dataNascimento) {
      const nascimento = new Date(dataNascimento);
      if (data.getDate() === nascimento.getDate() && data.getMonth() === nascimento.getMonth()) {
        return 'aniversario';
      }
    }

    // Datas comemorativas (simplificado)
    const datasEspeciais = [
      { dia: 14, mes: 1 }, // Dia dos Namorados
      { dia: 8, mes: 2 }, // Dia Internacional da Mulher
      { dia: 12, mes: 5 }, // Dia das Mães
      { dia: 9, mes: 7 }, // Dia dos Pais
      { dia: 12, mes: 9 }, // Dia das Crianças
      { dia: 25, mes: 11 }, // Natal
    ];

    const ehDataEspecial = datasEspeciais.some(
      dataEsp => data.getDate() === dataEsp.dia && data.getMonth() === dataEsp.mes - 1
    );

    return ehDataEspecial ? 'especial' : 'normal';
  }

  /**
   * Determina o nível de fidelidade do cliente
   * @param {Object} cliente - Dados do cliente
   * @returns {Object} - Informações do nível de fidelidade
   */
  determinarNivelFidelidade(cliente) {
    // Calcular pontos do último mês
    const hoje = new Date();
    const umMesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());

    const pontosMes = cliente.historicoCompras
      .filter(compra => {
        const dataCompra = new Date(compra.data);
        return dataCompra >= umMesAtras && dataCompra <= hoje;
      })
      .reduce((total, compra) => total + compra.pontos, 0);

    // Calcular pontos do último semestre
    const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 6, hoje.getDate());

    const pontosSemestre = cliente.historicoCompras
      .filter(compra => {
        const dataCompra = new Date(compra.data);
        return dataCompra >= seisMesesAtras && dataCompra <= hoje;
      })
      .reduce((total, compra) => total + compra.pontos, 0);

    // Determinar nível com base nos pontos
    let nivelAtual = this.configuracoes.niveis[0]; // Nível Bronze por padrão

    for (let i = this.configuracoes.niveis.length - 1; i >= 0; i--) {
      const nivel = this.configuracoes.niveis[i];
      if (
        pontosMes >= nivel.pontosMinimosMensais &&
        pontosSemestre >= nivel.pontosMinimosSemestrais
      ) {
        nivelAtual = nivel;
        break;
      }
    }

    // Calcular pontos para o próximo nível
    let proximoNivel = null;
    let pontosParaProximoNivel = 0;

    const indexAtual = this.configuracoes.niveis.findIndex(n => n.nome === nivelAtual.nome);
    if (indexAtual < this.configuracoes.niveis.length - 1) {
      proximoNivel = this.configuracoes.niveis[indexAtual + 1];
      pontosParaProximoNivel = Math.max(
        proximoNivel.pontosMinimosMensais - pontosMes,
        Math.ceil((proximoNivel.pontosMinimosSemestrais - pontosSemestre) / 6)
      );
    }

    return {
      nivelAtual: nivelAtual.nome,
      pontosMes,
      pontosSemestre,
      proximoNivel: proximoNivel ? proximoNivel.nome : null,
      pontosParaProximoNivel: pontosParaProximoNivel > 0 ? pontosParaProximoNivel : 0,
    };
  }

  /**
   * Gera recomendações de recompensas personalizadas para o cliente
   * @param {Object} cliente - Dados do cliente
   * @param {number} limite - Número máximo de recomendações
   * @returns {Array} - Lista de recompensas recomendadas
   */
  gerarRecomendacoesRecompensas(cliente, limite = 3) {
    // Obter nível de fidelidade atual
    const infoNivel = this.determinarNivelFidelidade(cliente);

    // Filtrar recompensas elegíveis para o nível do cliente
    let recompensasElegiveis = this.catalogoRecompensas.filter(
      recompensa =>
        recompensa.niveisElegiveis.includes(infoNivel.nivelAtual) &&
        recompensa.pontosNecessarios <= cliente.pontosTotais
    );

    // Se não houver recompensas elegíveis, mostrar as próximas possíveis
    if (recompensasElegiveis.length === 0) {
      recompensasElegiveis = this.catalogoRecompensas.filter(
        recompensa =>
          recompensa.niveisElegiveis.includes(infoNivel.nivelAtual) &&
          recompensa.pontosNecessarios > cliente.pontosTotais
      );

      // Ordenar por pontos necessários (do menor para o maior)
      recompensasElegiveis.sort((a, b) => a.pontosNecessarios - b.pontosNecessarios);

      // Retornar as recompensas mais próximas de serem alcançadas
      return recompensasElegiveis.slice(0, limite).map(recompensa => ({
        ...recompensa,
        pontosRestantes: recompensa.pontosNecessarios - cliente.pontosTotais,
        elegivel: false,
      }));
    }

    // Calcular pontuação de relevância para cada recompensa
    const recompensasComRelevancia = recompensasElegiveis.map(recompensa => {
      let relevancia = 0;

      // Fator 1: Preferência por categoria
      if (
        recompensa.categorias.includes('todas') ||
        cliente.categoriasPreferidas.some(cat => recompensa.categorias.includes(cat))
      ) {
        relevancia += 3;
      }

      // Fator 2: Histórico de resgate
      const jaResgatou = cliente.historicoResgates.some(r => r.recompensaId === recompensa.id);
      if (jaResgatou) {
        // Se já resgatou esta recompensa antes, pode ser do interesse
        relevancia += 2;

        // Mas se resgatou muito recentemente, reduzir relevância
        const ultimoResgate = cliente.historicoResgates
          .filter(r => r.recompensaId === recompensa.id)
          .sort((a, b) => new Date(b.data) - new Date(a.data))[0];

        const diasDesdeUltimoResgate = Math.floor(
          (new Date() - new Date(ultimoResgate.data)) / (1000 * 60 * 60 * 24)
        );

        if (diasDesdeUltimoResgate < 30) {
          relevancia -= 3;
        }
      }

      // Fator 3: Tipo de recompensa preferido
      if (cliente.tiposRecompensasPreferidos.includes(recompensa.tipo)) {
        relevancia += 2;
      }

      // Fator 4: Eficiência de pontos (valor/pontos)
      if (recompensa.valor > 0) {
        const eficiencia = recompensa.valor / recompensa.pontosNecessarios;
        relevancia += eficiencia * 10; // Normalizar para escala similar
      }

      return {
        ...recompensa,
        relevancia,
        elegivel: true,
        pontosRestantes: 0,
      };
    });

    // Ordenar por relevância
    recompensasComRelevancia.sort((a, b) => b.relevancia - a.relevancia);

    return recompensasComRelevancia.slice(0, limite);
  }

  /**
   * Processa o resgate de uma recompensa
   * @param {Object} cliente - Dados do cliente
   * @param {string} recompensaId - ID da recompensa a ser resgatada
   * @returns {Object} - Resultado do resgate
   */
  resgatarRecompensa(cliente, recompensaId) {
    // Encontrar a recompensa no catálogo
    const recompensa = this.catalogoRecompensas.find(r => r.id === recompensaId);
    if (!recompensa) {
      return {
        sucesso: false,
        mensagem: 'Recompensa não encontrada',
      };
    }

    // Verificar se o cliente tem pontos suficientes
    if (cliente.pontosTotais < recompensa.pontosNecessarios) {
      return {
        sucesso: false,
        mensagem: `Pontos insuficientes. Necessários: ${recompensa.pontosNecessarios}, Disponíveis: ${cliente.pontosTotais}`,
      };
    }

    // Verificar se o cliente está no nível elegível
    const infoNivel = this.determinarNivelFidelidade(cliente);
    if (!recompensa.niveisElegiveis.includes(infoNivel.nivelAtual)) {
      return {
        sucesso: false,
        mensagem: `Seu nível atual (${infoNivel.nivelAtual}) não é elegível para esta recompensa`,
      };
    }

    // Processar o resgate
    const dataResgate = new Date().toISOString();
    const codigoResgate = this.gerarCodigoResgate();

    // Atualizar dados do cliente (simulado)
    cliente.pontosTotais -= recompensa.pontosNecessarios;
    cliente.historicoResgates.push({
      recompensaId: recompensa.id,
      data: dataResgate,
      pontos: recompensa.pontosNecessarios,
      codigo: codigoResgate,
    });

    return {
      sucesso: true,
      mensagem: 'Recompensa resgatada com sucesso',
      recompensa: recompensa.nome,
      codigo: codigoResgate,
      dataResgate,
      pontosUtilizados: recompensa.pontosNecessarios,
      pontosRestantes: cliente.pontosTotais,
    };
  }

  /**
   * Gera um código único para resgate de recompensa
   * @returns {string} - Código de resgate
   */
  gerarCodigoResgate() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem caracteres ambíguos
    let codigo = '';

    for (let i = 0; i < 8; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));

      // Adicionar hífen no meio para facilitar leitura
      if (i === 3) codigo += '-';
    }

    return codigo;
  }

  /**
   * Calcula a previsão de pontos futuros com base no histórico
   * @param {Object} cliente - Dados do cliente
   * @param {number} meses - Número de meses para previsão
   * @returns {Object} - Previsão de pontos
   */
  preverPontosFuturos(cliente, meses = 3) {
    // Calcular média de pontos mensais nos últimos 6 meses
    const hoje = new Date();
    const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 6, hoje.getDate());

    const comprasUltimosSeisMeses = cliente.historicoCompras.filter(compra => {
      const dataCompra = new Date(compra.data);
      return dataCompra >= seisMesesAtras && dataCompra <= hoje;
    });

    // Se não houver histórico suficiente, usar estimativa conservadora
    if (comprasUltimosSeisMeses.length < 3) {
      return {
        pontosMensaisEstimados: 50,
        pontosEstimadosEmXMeses: 50 * meses,
        confiabilidade: 'baixa',
      };
    }

    // Calcular média mensal de pontos
    const totalPontos = comprasUltimosSeisMeses.reduce((sum, compra) => sum + compra.pontos, 0);
    const pontosMensaisEstimados = Math.round(totalPontos / 6);

    // Calcular tendência (crescimento ou queda)
    const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, hoje.getDate());

    const pontosPrimeiros3Meses = comprasUltimosSeisMeses
      .filter(compra => new Date(compra.data) < tresMesesAtras)
      .reduce((sum, compra) => sum + compra.pontos, 0);

    const pontosUltimos3Meses = comprasUltimosSeisMeses
      .filter(compra => new Date(compra.data) >= tresMesesAtras)
      .reduce((sum, compra) => sum + compra.pontos, 0);

    const taxaCrescimento = pontosUltimos3Meses / (pontosPrimeiros3Meses || 1) - 1;

    // Aplicar tendência à previsão
    let pontosEstimadosTotal = 0;
    for (let i = 1; i <= meses; i++) {
      const fatorCrescimento = 1 + (taxaCrescimento * i) / meses;
      pontosEstimadosTotal += Math.round(
        pontosMensaisEstimados * Math.max(0.8, Math.min(1.5, fatorCrescimento))
      );
    }

    // Determinar confiabilidade da previsão
    let confiabilidade = 'média';
    if (comprasUltimosSeisMeses.length > 10) {
      confiabilidade = 'alta';
    } else if (comprasUltimosSeisMeses.length < 5) {
      confiabilidade = 'baixa';
    }

    return {
      pontosMensaisEstimados,
      pontosEstimadosEmXMeses: pontosEstimadosTotal,
      tendencia:
        taxaCrescimento > 0.1 ? 'crescimento' : taxaCrescimento < -0.1 ? 'queda' : 'estável',
      confiabilidade,
    };
  }
}

// Exportar a classe para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SistemaFidelidadeInteligente };
} else if (typeof window !== 'undefined') {
  // Disponibilizar no escopo global quando em ambiente de navegador
  window.SistemaFidelidadeInteligente = SistemaFidelidadeInteligente;
}

// Exemplo de uso
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar o sistema de fidelidade
  const sistemaFidelidade = new SistemaFidelidadeInteligente();

  // Exemplo de cliente (simulado)
  const clienteExemplo = {
    id: 'cliente123',
    nome: 'Maria Silva',
    dataNascimento: '1985-06-15',
    pontosTotais: 450,
    categoriasPreferidas: ['bolos', 'doces'],
    tiposRecompensasPreferidos: ['desconto', 'produto'],
    historicoCompras: [
      { data: '2023-01-10', valorTotal: 120, categorias: ['bolos'], pontos: 120 },
      { data: '2023-02-05', valorTotal: 85, categorias: ['doces'], pontos: 85 },
      { data: '2023-03-15', valorTotal: 150, categorias: ['bolos', 'premium'], pontos: 195 },
      { data: '2023-04-20', valorTotal: 200, categorias: ['bolos', 'premium'], pontos: 260 },
      { data: '2023-05-10', valorTotal: 75, categorias: ['doces'], pontos: 75 },
      { data: '2023-06-15', valorTotal: 180, categorias: ['bolos', 'premium'], pontos: 360 }, // Aniversário
    ],
    historicoResgates: [
      { recompensaId: 'desconto-10', data: '2023-02-10', pontos: 100, codigo: 'ABCD-1234' },
      { recompensaId: 'frete-gratis', data: '2023-04-25', pontos: 150, codigo: 'EFGH-5678' },
    ],
  };

  // Demonstração das funcionalidades (para fins de teste)
  console.log('Sistema de Fidelidade Inteligente - Demonstração');

  // 1. Determinar nível de fidelidade
  const nivelFidelidade = sistemaFidelidade.determinarNivelFidelidade(clienteExemplo);
  console.log('Nível de Fidelidade:', nivelFidelidade);

  // 2. Gerar recomendações de recompensas
  const recomendacoes = sistemaFidelidade.gerarRecomendacoesRecompensas(clienteExemplo);
  console.log('Recompensas Recomendadas:', recomendacoes);

  // 3. Simular uma nova compra
  const novaCompra = {
    valorTotal: 150,
    categorias: ['bolos', 'premium'],
    data: new Date().toISOString(),
  };

  const pontos = sistemaFidelidade.calcularPontos(novaCompra, clienteExemplo);
  console.log(`Nova compra: R$ ${novaCompra.valorTotal} = ${pontos} pontos`);

  // 4. Previsão de pontos futuros
  const previsao = sistemaFidelidade.preverPontosFuturos(clienteExemplo);
  console.log('Previsão de Pontos:', previsao);
});
