export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'admin' | 'courier' | 'customer';
  senderName: string;
  text: string;
  createdAt: string | Date;
  read: boolean;
}

export interface ChatSession {
  orderId: string;
  participants: {
    id: string;
    role: 'admin' | 'courier' | 'customer';
    name: string;
  }[];
  lastMessage?: ChatMessage;
  updatedAt: string | Date;
}
