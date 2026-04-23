import { ValidationService } from '../services/validationService';

const validationService = ValidationService.getInstance();

export const isValidEmail = (email: string): boolean => {
  return validationService.validateEmail(email);
};
