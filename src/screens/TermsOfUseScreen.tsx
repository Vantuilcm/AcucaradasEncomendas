import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../components/ThemeProvider';

export function TermsOfUseScreen() {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView testID="terms-scroll-view" style={styles.scrollView}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Política de Uso
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Açucaradas Encomendas
          </Text>

          <Text variant="bodyMedium" style={styles.intro}>
            Esta política de uso visa esclarecer os termos e condições para todos os usuários do
            aplicativo Açucaradas Encomendas (doravante App), garantindo uma experiência
            transparente e segura para compradores, produtores e entregadores.
          </Text>

          <List.Section>
            <List.Subheader>I. Disposições Gerais e Natureza da Plataforma</List.Subheader>

            <List.Item
              testID="list-item-natureza-facilitadora"
              title="Natureza Facilitadora"
              description="O App 'Açucaradas Encomendas' é uma plataforma digital que atua como intermediária e facilitadora, conectando clientes, produtores e entregadores."
              left={props => <List.Icon {...props} icon="information" />}
            />

            <List.Item
              testID="list-item-plataforma-aproximacao"
              title="Plataforma de Aproximação"
              description="O App não é uma loja online, nem uma empresa de doces, nem uma empresa de entrega. Ele oferece um espaço virtual para que usuários independentes se conectem."
              left={props => <List.Icon {...props} icon="store" />}
            />

            <List.Item
              testID="list-item-isencao-responsabilidade"
              title="Isenção de Responsabilidade"
              description="A plataforma não se responsabiliza pela qualidade dos produtos, produção, entrega ou disputas entre usuários."
              left={props => <List.Icon {...props} icon="alert" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>II. Política para Usuários Compradores</List.Subheader>

            <List.Item
              testID="list-item-plataforma-conexao"
              title="Plataforma de Conexão"
              description="O Cliente compreende que o App é um canal de contato com produtores e entregadores independentes."
              left={props => <List.Icon {...props} icon="account" />}
            />

            <List.Item
              testID="list-item-escolha-avaliacao"
              title="Escolha e Avaliação"
              description="A escolha do produtor e do entregador é de total responsabilidade do Cliente."
              left={props => <List.Icon {...props} icon="star" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>III. Política para Produtores de Doces</List.Subheader>

            <List.Item
              testID="list-item-cadastro-documentacao-produtor"
              title="Cadastro e Documentação"
              description="Documentação obrigatória para cadastro como Produtor (CPF/CNPJ, RG, comprovantes, etc)."
              left={props => <List.Icon {...props} icon="file-document" />}
            />

            <List.Item
              testID="list-item-qualidade-seguranca"
              title="Qualidade e Segurança"
              description="Responsabilidade pela qualidade e segurança alimentar dos produtos."
              left={props => <List.Icon {...props} icon="food" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>IV. Política para Entregadores</List.Subheader>

            <List.Item
              testID="list-item-cadastro-documentacao-entregador"
              title="Cadastro e Documentação"
              description="Documentação obrigatória para cadastro como Entregador (CPF, RG, CNH, etc)."
              left={props => <List.Icon {...props} icon="bike-fast" />}
            />

            <List.Item
              testID="list-item-entrega-responsabilidade"
              title="Entrega e Responsabilidade"
              description="Responsabilidade pela retirada, transporte e entrega dos pedidos."
              left={props => <List.Icon {...props} icon="package-variant" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>V. Política de Privacidade e Proteção de Dados (LGPD)</List.Subheader>

            <List.Item
              title="Coleta de Dados"
              description="Coletamos dados essenciais: Nome, E-mail, Telefone, Endereço de entrega e Localização (GPS) para facilitar a conexão entre as partes."
              left={props => <List.Icon {...props} icon="database-check" />}
            />

            <List.Item
              title="Finalidade do Tratamento"
              description="Seus dados são usados exclusivamente para processar pedidos, calcular fretes, garantir a segurança das transações e suporte técnico."
              left={props => <List.Icon {...props} icon="target" />}
            />

            <List.Item
              title="Compartilhamento Necessário"
              description="Para a entrega, compartilhamos seu nome e endereço com o Produtor e o Entregador escolhidos. Dados de pagamento são processados de forma criptografada via Stripe."
              left={props => <List.Icon {...props} icon="share-variant" />}
            />

            <List.Item
              title="Seus Direitos (LGPD)"
              description="Você tem direito a acessar, corrigir, portar ou excluir seus dados a qualquer momento através das configurações do app ou suporte."
              left={props => <List.Icon {...props} icon="gavel" />}
            />
            
            <List.Item
              title="Segurança"
              description="Utilizamos criptografia SSL, autenticação Firebase e proteção contra capturas de tela para garantir a integridade das suas informações."
              left={props => <List.Icon {...props} icon="shield-lock" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>VI. Regras de Uso e Conduta</List.Subheader>

            <List.Item
              title="Uso Proibido"
              description="É proibido o uso de dados falsos, perfis fakes, comportamento abusivo com outros usuários ou tentativa de burlar os sistemas de pagamento."
              left={props => <List.Icon {...props} icon="cancel" />}
            />

            <List.Item
              title="Propriedade Intelectual"
              description="Todo o conteúdo, logo e design do App pertencem à Açucaradas Encomendas e não podem ser replicados sem autorização."
              left={props => <List.Icon {...props} icon="copyright" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>VII. Contato e Suporte</List.Subheader>

            <List.Item
              testID="list-item-canais-atendimento"
              title="Canais de Atendimento"
              description="Suporte@acucaradasencomendas.com.br"
              left={props => <List.Icon {...props} icon="email" />}
            />

            <List.Item
              testID="list-item-chat-suporte"
              title="Chat de Suporte"
              description="Disponível dentro do aplicativo"
              left={props => <List.Icon {...props} icon="chat" />}
            />
          </List.Section>

          <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.text.secondary }]}>
            Versão do Documento: 1.1.8-996 | Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  intro: {
    marginBottom: 24,
    lineHeight: 24,
  },
  divider: {
    marginVertical: 16,
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
  },
});
