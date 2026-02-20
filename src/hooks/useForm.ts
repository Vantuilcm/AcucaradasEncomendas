import { useState, useCallback } from 'react';
import { loggingService } from '../services/LoggingService';

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

interface FormHandlers<T> {
  handleChange: (field: keyof T, value: any) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void>) => Promise<void>;
  resetForm: () => void;
}

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: (values: T) => Partial<Record<keyof T, string>>
): [FormState<T>, FormHandlers<T>] {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (field: keyof T, value: any) => {
      setValues(prev => ({
        ...prev,
        [field]: value,
      }));

      if (validationSchema) {
        const newErrors = validationSchema({ ...values, [field]: value });
        setErrors(prev => ({
          ...prev,
          [field]: newErrors[field],
        }));
      }
    },
    [values, validationSchema]
  );

  const handleBlur = useCallback(
    (field: keyof T) => {
      setTouched(prev => ({
        ...prev,
        [field]: true,
      }));

      if (validationSchema) {
        const newErrors = validationSchema(values);
        setErrors(prev => ({
          ...prev,
          [field]: newErrors[field],
        }));
      }
    },
    [values, validationSchema]
  );

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void>) => {
      try {
        setIsSubmitting(true);

        if (validationSchema) {
          const newErrors = validationSchema(values);
          setErrors(newErrors);

          if (Object.keys(newErrors).length > 0) {
            loggingService.warn('Formulário com erros de validação', { errors: newErrors });
            return;
          }
        }

        await onSubmit(values);
        loggingService.info('Formulário enviado com sucesso', { values });
      } catch (err) {
        loggingService.error('Erro ao enviar formulário', { error: err });
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validationSchema]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    loggingService.info('Formulário resetado');
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;

  return [
    {
      values,
      errors,
      touched,
      isSubmitting,
      isValid,
    },
    {
      handleChange,
      handleBlur,
      handleSubmit,
      resetForm,
    },
  ];
}
