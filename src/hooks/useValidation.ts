import { useCallback } from 'react';

export function useValidation() {
  const validateEmail = useCallback((email: string): string | null => {
    if (!email.trim()) {
      return 'Email é obrigatório';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email inválido';
    }

    return null;
  }, []);

  const validatePassword = useCallback((password: string): string | null => {
    if (!password) {
      return 'Senha é obrigatória';
    }

    if (password.length < 6) {
      return 'A senha deve ter no mínimo 6 caracteres';
    }

    return null;
  }, []);

  const validateName = useCallback((name: string): string | null => {
    if (!name.trim()) {
      return 'Nome é obrigatório';
    }

    if (name.length < 3) {
      return 'O nome deve ter no mínimo 3 caracteres';
    }

    return null;
  }, []);

  const validatePhone = useCallback((phone: string): string | null => {
    if (!phone.trim()) {
      return 'Telefone é obrigatório';
    }

    const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
      return 'Telefone inválido';
    }

    return null;
  }, []);

  const validateAddress = useCallback((address: string): string | null => {
    if (!address.trim()) {
      return 'Endereço é obrigatório';
    }

    if (address.length < 10) {
      return 'O endereço deve ter no mínimo 10 caracteres';
    }

    return null;
  }, []);

  return {
    validateEmail,
    validatePassword,
    validateName,
    validatePhone,
    validateAddress,
  };
}
