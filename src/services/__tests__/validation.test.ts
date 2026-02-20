import { validateFaceImage, validateDocument } from '../validationService';

describe('Validação de Imagem Facial', () => {
  it('deve validar uma imagem facial válida', async () => {
    const imagemBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'; // Imagem base64 simulada
    const resultado = await validateFaceImage(imagemBase64);
    expect(resultado).toBe(true);
  });

  it('deve lançar erro para uma imagem inválida', async () => {
    const imagemInvalida = 'imagem-invalida';
    await expect(validateFaceImage(imagemInvalida)).rejects.toThrow();
  });
});

describe('Validação de Documento', () => {
  it('deve validar um documento válido', async () => {
    const documento = {
      type: 'image/jpeg',
      buffer: Buffer.from('dados-do-documento'),
    };
    const resultado = await validateDocument('RG', documento);
    expect(resultado).toBe(true);
  });

  it('deve lançar erro para um documento inválido', async () => {
    const documentoInvalido = null;
    await expect(validateDocument('RG', documentoInvalido)).rejects.toThrow();
  });

  it('deve validar diferentes tipos de documentos', async () => {
    const documento = {
      type: 'image/jpeg',
      buffer: Buffer.from('dados-do-documento'),
    };

    const tiposDocumento = ['RG', 'CPF', 'CNH', 'CNPJ'];

    for (const tipo of tiposDocumento) {
      const resultado = await validateDocument(tipo, documento);
      expect(resultado).toBe(true);
    }
  });
});
