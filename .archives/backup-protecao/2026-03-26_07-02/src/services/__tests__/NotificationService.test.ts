import { NotificationService } from '../NotificationService';

// Unmock NotificationService to test real logic
jest.unmock('../NotificationService');

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = NotificationService.getInstance();
    jest.clearAllMocks();
    
    // Reset internal map if possible, or ensure consistent state
    // Since we can't easily reset private map, we rely on creating new data for tests that need it
    // or ensuring existing data (not_123) is in a known state.
    // However, since singleton persists, 'not_123' might be modified by previous tests.
    // Ideally we should add a method to reset for testing, but for now we will be careful.
    
    // Re-initialize test data if needed?
    // We can't access private methods.
    // We will just create new notifications for tests to be safe.
  });

  describe('enviarNotificacao', () => {
    it('deve enviar uma notificação com sucesso', async () => {
      const dadosNotificacao = {
        titulo: 'Teste de notificação',
        mensagem: 'Esta é uma mensagem de teste',
        destinatario: 'usuario@exemplo.com',
        tipo: 'push' as const,
      };

      const resultado = await notificationService.enviarNotificacao(dadosNotificacao);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.status).toBe('enviado');
    });

    it('deve rejeitar notificação com destinatário inválido', async () => {
      const dadosNotificacao = {
        titulo: 'Teste de notificação',
        mensagem: 'Esta é uma mensagem de teste',
        destinatario: 'email-invalido',
        tipo: 'email' as const,
      };

      await expect(notificationService.enviarNotificacao(dadosNotificacao)).rejects.toThrow(
        'Destinatário inválido'
      );
    });

    it('deve rejeitar notificação sem título', async () => {
      const dadosNotificacao = {
        mensagem: 'Esta é uma mensagem de teste',
        destinatario: 'usuario@exemplo.com',
        tipo: 'push' as const,
      } as any;

      await expect(notificationService.enviarNotificacao(dadosNotificacao)).rejects.toThrow(
        'Título é obrigatório'
      );
    });

    it('deve rejeitar notificação sem mensagem', async () => {
      const dadosNotificacao = {
        titulo: 'Teste de notificação',
        destinatario: 'usuario@exemplo.com',
        tipo: 'push' as const,
      } as any;

      await expect(notificationService.enviarNotificacao(dadosNotificacao)).rejects.toThrow(
        'Mensagem é obrigatória'
      );
    });
  });

  describe('consultarNotificacao', () => {
    it('deve consultar uma notificação existente', async () => {
      // Create a fresh notification to ensure it exists
      const dadosNotificacao = {
        titulo: 'Teste Consulta',
        mensagem: 'Mensagem Consulta',
        destinatario: 'consulta@teste.com',
        tipo: 'email' as const,
      };
      const criada = await notificationService.enviarNotificacao(dadosNotificacao);
      
      const resultado = await notificationService.consultarNotificacao(criada.id);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(criada.id);
      expect(resultado.status).toBe('enviado');
    });

    it('deve retornar erro para notificação inexistente', async () => {
      const idNotificacao = 'not_inexistente_' + Date.now();
      await expect(notificationService.consultarNotificacao(idNotificacao)).rejects.toThrow(
        'Notificação não encontrada'
      );
    });
  });

  describe('marcarComoLida', () => {
    it('deve marcar uma notificação como lida', async () => {
      // Create fresh notification
      const dadosNotificacao = {
        titulo: 'Teste Lida',
        mensagem: 'Mensagem Lida',
        destinatario: 'lida@teste.com',
        tipo: 'email' as const,
      };
      const criada = await notificationService.enviarNotificacao(dadosNotificacao);

      const resultado = await notificationService.marcarComoLida(criada.id);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(criada.id);
      expect(resultado.status).toBe('lida');
    });

    it('deve retornar erro ao tentar marcar notificação inexistente como lida', async () => {
      const idNotificacao = 'not_inexistente_' + Date.now();
      await expect(notificationService.marcarComoLida(idNotificacao)).rejects.toThrow(
        'Notificação não encontrada'
      );
    });

    it('deve retornar erro ao tentar marcar notificação já lida', async () => {
      // Create and mark as read
      const dadosNotificacao = {
        titulo: 'Teste Ja Lida',
        mensagem: 'Mensagem Ja Lida',
        destinatario: 'jalida@teste.com',
        tipo: 'email' as const,
      };
      const criada = await notificationService.enviarNotificacao(dadosNotificacao);
      await notificationService.marcarComoLida(criada.id);

      // Try to mark as read again
      await expect(notificationService.marcarComoLida(criada.id)).rejects.toThrow(
        'Notificação já está lida'
      );
    });
  });

  describe('listarNotificacoes', () => {
    it('deve listar notificações com sucesso', async () => {
      // Create a notification that matches filters
      const dadosNotificacao = {
        titulo: 'Teste Listar',
        mensagem: 'Mensagem Listar',
        destinatario: 'listar@teste.com',
        tipo: 'email' as const,
      };
      const criada = await notificationService.enviarNotificacao(dadosNotificacao);

      const filtros = {
        destinatario: 'listar@teste.com',
        status: 'enviado', // Must match 'enviado'
        // Date filters are ignored by current implementation so removing them to avoid confusion
      };

      const resultado = await notificationService.listarNotificacoes(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);
      
      const found = resultado.find(n => n.id === criada.id);
      expect(found).toBeDefined();
    });

    it('deve retornar lista vazia quando não há notificações correspondentes', async () => {
      const filtros = {
        destinatario: 'ninguem@teste.com',
        status: 'enviado',
      };

      const resultado = await notificationService.listarNotificacoes(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBe(0);
    });
  });

  describe('excluirNotificacao', () => {
    it('deve excluir uma notificação com sucesso', async () => {
      // Create notification
      const dadosNotificacao = {
        titulo: 'Teste Excluir',
        mensagem: 'Mensagem Excluir',
        destinatario: 'excluir@teste.com',
        tipo: 'email' as const,
      };
      const criada = await notificationService.enviarNotificacao(dadosNotificacao);

      const resultado = await notificationService.excluirNotificacao(criada.id);
      expect(resultado).toBe(true);
      
      // Verify status is 'excluida'
      const check = await notificationService.consultarNotificacao(criada.id);
      expect(check.status).toBe('excluida');
    });

    it('deve retornar erro ao tentar excluir notificação inexistente', async () => {
      const idNotificacao = 'not_inexistente_' + Date.now();
      await expect(notificationService.excluirNotificacao(idNotificacao)).rejects.toThrow(
        'Notificação não encontrada'
      );
    });
  });
});
