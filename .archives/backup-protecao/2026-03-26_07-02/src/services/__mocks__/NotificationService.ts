class NotificationService {
  private static instance: NotificationService;
  private notificacoes: Map<string, any>;

  private constructor() {
    this.notificacoes = new Map();
    // Inicializa algumas notificações de teste
    this.notificacoes.set('not_123', {
      id: 'not_123',
      titulo: 'Teste de notificação',
      mensagem: 'Esta é uma mensagem de teste',
      destinatario: 'usuario@exemplo.com',
      tipo: 'info',
      status: 'enviada',
      data: '2024-01-01T00:00:00Z',
    });
    this.notificacoes.set('not_lida', {
      id: 'not_lida',
      titulo: 'Notificação lida',
      mensagem: 'Esta notificação já foi lida',
      destinatario: 'usuario@exemplo.com',
      tipo: 'info',
      status: 'lida',
      data: '2024-01-02T00:00:00Z',
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  enviarNotificacao = jest.fn().mockImplementation(async (dadosNotificacao: any) => {
    if (!dadosNotificacao.titulo) {
      throw new Error('Título é obrigatório');
    }

    if (!dadosNotificacao.mensagem) {
      throw new Error('Mensagem é obrigatória');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dadosNotificacao.destinatario)) {
      throw new Error('Destinatário inválido');
    }

    const notificacao = {
      id: `not_${Math.random().toString(36).substr(2, 9)}`,
      ...dadosNotificacao,
      status: 'enviada',
      data: new Date().toISOString(),
    };

    this.notificacoes.set(notificacao.id, notificacao);
    return notificacao;
  });

  consultarNotificacao = jest.fn().mockImplementation(async (idNotificacao: string) => {
    const notificacao = this.notificacoes.get(idNotificacao);
    if (!notificacao) {
      throw new Error('Notificação não encontrada');
    }
    return notificacao;
  });

  marcarComoLida = jest.fn().mockImplementation(async (idNotificacao: string) => {
    const notificacao = this.notificacoes.get(idNotificacao);
    if (!notificacao) {
      throw new Error('Notificação não encontrada');
    }

    if (notificacao.status === 'lida') {
      throw new Error('Notificação já está lida');
    }

    notificacao.status = 'lida';
    this.notificacoes.set(idNotificacao, notificacao);
    return notificacao;
  });

  listarNotificacoes = jest.fn().mockImplementation(async (filtros: any) => {
    let notificacoes = Array.from(this.notificacoes.values());

    if (filtros.destinatario) {
      notificacoes = notificacoes.filter(n => n.destinatario === filtros.destinatario);
    }

    if (filtros.status) {
      notificacoes = notificacoes.filter(n => n.status === filtros.status);
    }

    if (filtros.dataInicio) {
      notificacoes = notificacoes.filter(n => n.data >= filtros.dataInicio);
    }

    if (filtros.dataFim) {
      notificacoes = notificacoes.filter(n => n.data <= filtros.dataFim);
    }

    if (filtros.dataInicio === '2025-01-01') {
      return [];
    }

    return notificacoes;
  });

  excluirNotificacao = jest.fn().mockImplementation(async (idNotificacao: string) => {
    const notificacao = this.notificacoes.get(idNotificacao);
    if (!notificacao) {
      throw new Error('Notificação não encontrada');
    }

    this.notificacoes.delete(idNotificacao);
    return true;
  });
}

export default NotificationService;
