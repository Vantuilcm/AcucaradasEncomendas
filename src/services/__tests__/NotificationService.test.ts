import { NotificationService } from '../NotificationService';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Remover jest.unmock para usar o mock global
// jest.unmock('../NotificationService');

// Mock das dependências do Firebase (mocks globais já existem em jest.setup.ts)
// jest.mock('firebase/app');
// jest.mock('firebase/firestore');
// jest.mock('firebase/messaging');

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = NotificationService.getInstance();
    jest.clearAllMocks();
    ;(notificationService as any).notificacoes = new Map();
    ;(notificationService as any).inicializarDadosTeste();
  });

  describe('enviarNotificacao', () => {
    it('deve enviar uma notificação com sucesso', async () => {
      const dadosNotificacao = {
        titulo: 'Teste de notificação',
        mensagem: 'Esta é uma mensagem de teste',
        destinatario: 'usuario@exemplo.com',
        tipo: 'email',
      };

      const resultado = await notificationService.enviarNotificacao(dadosNotificacao);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.status).toBe('enviada');
    });

    it('deve rejeitar notificação com destinatário inválido', async () => {
      const dadosNotificacao = {
        titulo: 'Teste de notificação',
        mensagem: 'Esta é uma mensagem de teste',
        destinatario: 'email-invalido',
        tipo: 'info',
      };

      await expect(notificationService.enviarNotificacao(dadosNotificacao)).rejects.toThrow(
        'Destinatário inválido'
      );
    });

    it('deve rejeitar notificação sem título', async () => {
      const dadosNotificacao = {
        mensagem: 'Esta é uma mensagem de teste',
        destinatario: 'usuario@exemplo.com',
        tipo: 'info',
      };

      await expect(notificationService.enviarNotificacao(dadosNotificacao)).rejects.toThrow(
        'Título é obrigatório'
      );
    });

    it('deve rejeitar notificação sem mensagem', async () => {
      const dadosNotificacao = {
        titulo: 'Teste de notificação',
        destinatario: 'usuario@exemplo.com',
        tipo: 'info',
      };

      await expect(notificationService.enviarNotificacao(dadosNotificacao)).rejects.toThrow(
        'Mensagem é obrigatória'
      );
    });
  });

  describe('consultarNotificacao', () => {
    it('deve consultar uma notificação existente', async () => {
      const idNotificacao = 'not_123';
      const resultado = await notificationService.consultarNotificacao(idNotificacao);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idNotificacao);
      expect(resultado.status).toBe('enviada');
    });

    it('deve retornar erro para notificação inexistente', async () => {
      const idNotificacao = 'not_inexistente';
      await expect(notificationService.consultarNotificacao(idNotificacao)).rejects.toThrow(
        'Notificação não encontrada'
      );
    });
  });

  describe('marcarComoLida', () => {
    it('deve marcar uma notificação como lida', async () => {
      const idNotificacao = 'not_123';
      const resultado = await notificationService.marcarComoLida(idNotificacao);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(idNotificacao);
      expect(resultado.status).toBe('lida');
    });

    it('deve retornar erro ao tentar marcar notificação inexistente como lida', async () => {
      const idNotificacao = 'not_inexistente';
      await expect(notificationService.marcarComoLida(idNotificacao)).rejects.toThrow(
        'Notificação não encontrada'
      );
    });

    it('deve retornar erro ao tentar marcar notificação já lida', async () => {
      const idNotificacao = 'not_lida';
      await expect(notificationService.marcarComoLida(idNotificacao)).rejects.toThrow(
        'Notificação já está lida'
      );
    });
  });

  describe('listarNotificacoes', () => {
    it('deve listar notificações com sucesso', async () => {
      const filtros = {
        destinatario: 'usuario@exemplo.com',
        status: 'enviada',
        dataInicio: '2024-01-01',
        dataFim: '2024-12-31',
      };

      const resultado = await notificationService.listarNotificacoes(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('deve retornar lista vazia quando não há notificações', async () => {
      const filtros = {
        destinatario: 'usuario@exemplo.com',
        status: 'enviada',
        dataInicio: '2025-01-01',
        dataFim: '2025-12-31',
      };

      const resultado = await notificationService.listarNotificacoes(filtros);
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBe(0);
    });
  });

  describe('excluirNotificacao', () => {
    it('deve excluir uma notificação com sucesso', async () => {
      const idNotificacao = 'not_123';
      const resultado = await notificationService.excluirNotificacao(idNotificacao);
      expect(resultado).toBe(true);
    });

    it('deve retornar erro ao tentar excluir notificação inexistente', async () => {
      const idNotificacao = 'not_inexistente';
      await expect(notificationService.excluirNotificacao(idNotificacao)).rejects.toThrow(
        'Notificação não encontrada'
      );
    });
  });
});
