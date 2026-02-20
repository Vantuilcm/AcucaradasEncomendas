export interface Address {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  principal?: boolean;
}

export interface User {
  id: string;
  // Compat fields used across various screens (Firebase-style)
  uid?: string; // alias to id
  displayName?: string;
  name?: string; // alias to nome
  phone?: string; // alias to telefone
  address?: any; // alias to endereco
  nome: string;
  email: string;
  telefone?: string;
  cpf?: string;
  endereco?: Address[];
  dataCriacao?: Date;
  ultimoLogin?: Date;
  isAdmin?: boolean;
  stripeCustomerId?: string;
  stripeAccountId?: string;
  // Papel do usuário para controle de permissões e UI
  role?: import('../services/PermissionsService').Role;
  perfil?: {
    fotoPerfil?: string;
    notificacoes?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
    preferencias?: {
      tema?: 'claro' | 'escuro' | 'sistema';
      linguagem?: string;
    };
  };
  producerProfile?: {
    storeName: string;
    cnpj?: string;
    cpf?: string;
    address: string;
  };
  courierProfile?: {
    cpf: string;
    cnh: string;
    vehicleType: string;
  };
}
