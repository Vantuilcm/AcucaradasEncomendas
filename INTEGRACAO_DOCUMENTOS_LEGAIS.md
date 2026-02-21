# Integração de Documentos Legais no Aplicativo

Este guia descreve como foram integrados os documentos legais (Política de Privacidade e Termos de Uso) no aplicativo Açucaradas Encomendas, conforme exigido pelas lojas de aplicativos.

## 1. Resumo da Implementação

Os documentos legais estão agora:

- Hospedados no site da empresa em [acucaradas.com.br](https://www.acucaradas.com.br)
- Acessíveis através de links dentro do aplicativo
- Configurados no arquivo `app.json` para fins de submissão nas lojas
- Verificáveis quanto à disponibilidade online

## 2. Componentes Implementados

Foram criados os seguintes recursos:

1. **Utilitários**:

   - `src/utils/legalDocuments.ts` - Funções para acessar os documentos legais
   - `src/utils/checkWebsiteStatus.ts` - Funções para verificar disponibilidade do site

2. **Componentes**:
   - `src/components/LegalDocumentLinks.tsx` - Componente reutilizável para exibir links legais

## 3. Como Usar o Componente LegalDocumentLinks

O componente pode ser inserido em qualquer tela do aplicativo. Recomenda-se incluí-lo em:

- Tela de login/cadastro
- Tela de perfil/configurações
- Rodapé da tela inicial
- Tela de finalização de compra

### Exemplo de uso básico:

```tsx
import React from 'react';
import { View } from 'react-native';
import LegalDocumentLinks from '../components/LegalDocumentLinks';

export default function LoginScreen() {
  return (
    <View>
      {/* ... outros componentes da tela ... */}

      <LegalDocumentLinks
        horizontal={true}
        contextMessage="Ao criar uma conta, você concorda com nossos"
      />
    </View>
  );
}
```

### Propriedades do componente:

- `darkMode` (opcional): Use `true` para texto claro em fundos escuros
- `horizontal` (opcional): Use `true` para exibir links na horizontal
- `showWebsiteLink` (opcional): Use `true` para incluir link para o site
- `contextMessage` (opcional): Texto explicativo antes dos links
- `style` (opcional): Estilo adicional para o container

## 4. Páginas Específicas Onde Adicionar os Links

### 4.1 Tela de Cadastro/Login

Adicionar ao final do formulário, antes do botão de envio:

```tsx
<LegalDocumentLinks
  horizontal={true}
  contextMessage="Ao criar uma conta, você concorda com nossos"
/>
```

### 4.2 Tela de Checkout

Adicionar próximo ao botão de finalização de compra:

```tsx
<LegalDocumentLinks
  horizontal={true}
  contextMessage="Ao finalizar a compra, você concorda com nossos"
/>
```

### 4.3 Perfil/Configurações

Adicionar como itens de menu:

```tsx
<View style={styles.settingsSection}>
  <Text style={styles.sectionTitle}>Legal</Text>
  <TouchableOpacity onPress={() => openPrivacyPolicy()}>
    <Text style={styles.menuItem}>Política de Privacidade</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => openTermsOfUse()}>
    <Text style={styles.menuItem}>Termos de Uso</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => openWebsite()}>
    <Text style={styles.menuItem}>Site Oficial</Text>
  </TouchableOpacity>
</View>
```

### 4.4 Rodapé da Aplicação

Em componentes de rodapé ou na tela "Sobre":

```tsx
<View style={styles.footer}>
  <LegalDocumentLinks horizontal={true} showWebsiteLink={true} contextMessage="" />
  <Text style={styles.copyright}>© 2025 Açucaradas Encomendas. Todos os direitos reservados.</Text>
</View>
```

## 5. Verificação da Disponibilidade dos Documentos

O sistema verifica automaticamente se os documentos estão acessíveis antes de tentar abri-los. É recomendável executar também uma verificação durante o processo de publicação:

```typescript
import { checkLegalDocumentsAvailability } from '../utils/legalDocuments';

// Em alguma função de verificação pré-publicação
const checkLegalDocs = async () => {
  const availability = await checkLegalDocumentsAvailability();
  console.log('Status dos documentos legais:', availability);

  if (!availability.privacyPolicy || !availability.termsOfUse) {
    console.error('Alerta: Documentos legais não estão disponíveis!');
    // Lógica para notificar o problema
  }
};
```

## 6. Notas Importantes para a Publicação

1. **Google Play**:

   - A Google Play requer que os links para a Política de Privacidade sejam válidos e acessíveis
   - Certifique-se de que os URLs no `app.json` estão corretos

2. **Apple App Store**:

   - A App Store é especialmente rigorosa com a acessibilidade da Política de Privacidade
   - URLs quebrados resultarão em rejeição do app

3. **Informações de Contato**:
   - Ambos os documentos no site contêm informações de contato reais (telefone e email)
   - O email `privacidade@acucaradas.com.br` deve estar ativo e monitorado

## 7. Monitoramento Contínuo

É importante verificar periodicamente se o site e os documentos legais continuam acessíveis. Considere implementar um sistema de monitoramento que alerte quando:

- O site estiver fora do ar por mais de 1 hora
- Os documentos legais não estiverem acessíveis
- Houver alterações não autorizadas nos documentos

---

**Lembre-se**: Manter os documentos legais acessíveis e atualizados não é apenas um requisito para as lojas de aplicativos, mas também uma obrigação legal perante os usuários e autoridades reguladoras como a ANPD (Autoridade Nacional de Proteção de Dados).
