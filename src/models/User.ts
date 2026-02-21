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
  nome: string;
  email: string;
  telefone?: string;
  cpf?: string;
  endereco?: Address[];
  dataCriacao?: Date;
  ultimoLogin?: Date;
  isAdmin?: boolean;
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
}
