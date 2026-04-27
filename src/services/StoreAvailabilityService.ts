import { Store } from '../types/Store';

export class StoreAvailabilityService {
  /**
   * Verifica se a loja está aberta no momento atual
   */
  static isStoreOpenNow(store: Store): boolean {
    if (!store.isOpen) return false;

    const now = new Date();
    return this.isStoreOpenAt(store, now);
  }

  /**
   * Verifica se a loja estará aberta em um momento específico
   */
  static isStoreOpenAt(store: Store, date: Date): boolean {
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const schedule = store.businessHours[dayOfWeek];

    if (!schedule || schedule.isClosed || !schedule.open || !schedule.close) {
      return false;
    }

    const todayStr = date.toISOString().split('T')[0];
    if (store.holidays?.includes(todayStr)) {
      return false;
    }

    const currentHours = date.getHours();
    const currentMinutes = date.getMinutes();
    const currentTime = currentHours * 60 + currentMinutes;

    const [openHours, openMinutes] = schedule.open.split(':').map(Number);
    const [closeHours, closeMinutes] = schedule.close.split(':').map(Number);

    const openTime = openHours * 60 + openMinutes;
    const closeTime = closeHours * 60 + closeMinutes;

    if (currentTime < openTime || currentTime > closeTime) {
      return false;
    }

    // Verificar pausa, se existir
    if (schedule.pauseStart && schedule.pauseEnd) {
      const [pauseStartHours, pauseStartMinutes] = schedule.pauseStart.split(':').map(Number);
      const [pauseEndHours, pauseEndMinutes] = schedule.pauseEnd.split(':').map(Number);
      
      const pauseStartTime = pauseStartHours * 60 + pauseStartMinutes;
      const pauseEndTime = pauseEndHours * 60 + pauseEndMinutes;

      if (currentTime >= pauseStartTime && currentTime <= pauseEndTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Valida se um pedido pode ser aceito com base no lead time e cutoff time
   * Retorna um objeto indicando validade e uma mensagem sugerindo o próximo horário
   */
  static validateOrderTiming(store: Store, requestedDate?: Date): { isValid: boolean; message?: string; nextAvailableTime?: Date } {
    const now = new Date();
    const targetDate = requestedDate || now;
    
    // 1. A loja precisa estar aberta (ou vai abrir em breve se for agendado)
    if (!this.isStoreOpenAt(store, targetDate)) {
      const nextTime = this.getNextAvailableTime(store, targetDate);
      return {
        isValid: false,
        message: `A loja está fechada. Próximo horário disponível: ${this.formatNextTime(nextTime)}`,
        nextAvailableTime: nextTime
      };
    }

    // 2. Verificar Cutoff Time se for para hoje
    if (this.isSameDay(now, targetDate) && store.cutoffTime) {
      const [cutoffHours, cutoffMinutes] = store.cutoffTime.split(':').map(Number);
      const cutoffTimeMinutes = cutoffHours * 60 + cutoffMinutes;
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

      if (currentTimeMinutes > cutoffTimeMinutes) {
        // Passou do cutoff time, só pode amanhã
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const nextTime = this.getNextAvailableTime(store, tomorrow);
        
        return {
          isValid: false,
          message: `Horário limite de pedidos para hoje excedido. Próximo horário disponível: ${this.formatNextTime(nextTime)}`,
          nextAvailableTime: nextTime
        };
      }
    }

    // 3. Verificar Lead Time (tempo de preparo)
    // Se o pedido é para 'agora', o lead time é adicionado para informar quando ficará pronto.
    // Se o pedido é agendado, a diferença entre agora e o horário agendado deve ser >= leadTime
    if (requestedDate) {
      const diffMinutes = (requestedDate.getTime() - now.getTime()) / (1000 * 60);
      if (diffMinutes < store.leadTime) {
        const nextValidTime = new Date(now.getTime() + store.leadTime * 60 * 1000);
        return {
          isValid: false,
          message: `O tempo de preparo é de ${store.leadTime} minutos. Próximo horário disponível: ${this.formatNextTime(nextValidTime)}`,
          nextAvailableTime: nextValidTime
        };
      }
    }

    return { isValid: true };
  }

  private static getNextAvailableTime(store: Store, fromDate: Date): Date {
    let checkDate = new Date(fromDate);
    
    // Limite de busca: 14 dias
    for (let i = 0; i < 14; i++) {
      const dayOfWeek = checkDate.getDay();
      const schedule = store.businessHours[dayOfWeek];
      const dateStr = checkDate.toISOString().split('T')[0];

      if (schedule && !schedule.isClosed && (!store.holidays || !store.holidays.includes(dateStr))) {
        // Encontrou um dia aberto
        const [openHours, openMinutes] = schedule.open.split(':').map(Number);
        
        // Se for hoje, e já passou da hora de abrir, verificar se ainda está aberto
        if (i === 0) {
          const currentTime = checkDate.getHours() * 60 + checkDate.getMinutes();
          const openTime = openHours * 60 + openMinutes;
          const [closeHours, closeMinutes] = schedule.close.split(':').map(Number);
          const closeTime = closeHours * 60 + closeMinutes;

          if (currentTime < closeTime) {
             if (currentTime < openTime) {
                checkDate.setHours(openHours, openMinutes, 0, 0);
             }
             // Adicionar lead time ao próximo horário de abertura
             checkDate = new Date(checkDate.getTime() + store.leadTime * 60 * 1000);
             return checkDate;
          }
        } else {
          checkDate.setHours(openHours, openMinutes, 0, 0);
          checkDate = new Date(checkDate.getTime() + store.leadTime * 60 * 1000);
          return checkDate;
        }
      }
      
      // Passar para o próximo dia
      checkDate.setDate(checkDate.getDate() + 1);
      checkDate.setHours(0, 0, 0, 0);
    }

    // Se não encontrou nada em 14 dias
    return checkDate;
  }

  private static formatNextTime(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (this.isSameDay(date, today)) {
      return `hoje às ${timeStr}`;
    } else if (this.isSameDay(date, tomorrow)) {
      return `amanhã às ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return `${dateStr} às ${timeStr}`;
    }
  }

  private static isSameDay(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }
}
