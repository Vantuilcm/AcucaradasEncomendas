import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Divider, useTheme } from 'react-native-paper';
import { Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function TermsOfUseScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView testID="terms-scroll-view" style={styles.scrollView}>
        <View style={styles.content}>
          <RNText style={styles.title}>
            Política de Uso
          </RNText>
          <Text variant="bodyLarge" style={styles.subtitle} testID="terms-subtitle">
            Açucaradas Encomendas
          </Text>

          <Text variant="bodyMedium" style={styles.intro} testID="terms-intro">
            Esta política de uso define regras contratuais obrigatórias para todos os usuários do
            aplicativo "Açucaradas Encomendas" (doravante "App"), garantindo uma experiência
            transparente e segura para compradores, produtores e entregadores.
          </Text>

          <List.Section>
            <List.Subheader testID="section-I. Disposições Gerais e Natureza da Plataforma">
              I. Disposições Gerais e Natureza da Plataforma
            </List.Subheader>

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
              description="A plataforma não se responsabiliza diretamente pela produção, entrega, pagamento ou qualidade dos produtos, atuando apenas como meio tecnológico de aproximação entre as partes."
              left={props => <List.Icon {...props} icon="alert" />}
            />

            <List.Item
              title="Comunicação e Registro em Ambiente Digital"
              description="As interações relevantes à compra e venda devem ocorrer pelos recursos internos do App, que podem ser utilizados para resolução de conflitos e registros de atendimento."
              left={props => <List.Icon {...props} icon="chat-processing" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader testID="section-II. Política para Usuários Compradores">
              II. Política para Usuários Compradores
            </List.Subheader>

            <List.Item
              testID="list-item-plataforma-conexao"
              title="Plataforma de Conexão"
              description="O Cliente compreende que o App é um canal de contato com produtores e entregadores independentes, não constituindo vínculo empregatício ou societário entre as partes."
              left={props => <List.Icon {...props} icon="account" />}
            />

            <List.Item
              testID="list-item-escolha-avaliacao"
              title="Escolha e Avaliação"
              description="A escolha do produtor e do entregador é de responsabilidade do Cliente, que deve avaliar avaliações, prazos, preços e demais informações exibidas no App."
              left={props => <List.Icon {...props} icon="star" />}
            />

            <List.Item
              title="Uso do Chat Interno"
              description="O Cliente se compromete a utilizar o chat interno apenas para tratar de dúvidas, ajustes e informações sobre pedidos realizados dentro do App, evitando linguagem ofensiva ou discriminatória."
              left={props => <List.Icon {...props} icon="chat-outline" />}
            />

            <List.Item
              title="Proibição de Negociação por Fora"
              description="É expressamente proibido combinar pagamentos, entregas ou encomendas por fora do App com o objetivo de fugir das regras, taxas ou mecanismos de segurança da plataforma. Qualquer operação realizada fora do App é de exclusiva responsabilidade das partes."
              left={props => <List.Icon {...props} icon="block-helper" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader testID="section-III. Política para Produtores de Doces">
              III. Política para Produtores de Doces
            </List.Subheader>

            <List.Item
              testID="list-item-cadastro-documentacao-produtor"
              title="Cadastro e Documentação"
              description="O Produtor deve manter seus dados cadastrais atualizados (CPF/CNPJ, documentos de identificação e informações de contato) e, quando aplicável, comprovações sanitárias e fiscais."
              left={props => <List.Icon {...props} icon="file-document" />}
            />

            <List.Item
              testID="list-item-qualidade-seguranca"
              title="Qualidade e Segurança"
              description="O Produtor é integralmente responsável pela qualidade, segurança alimentar, validade e conformidade dos produtos ofertados, respeitando a legislação aplicável."
              left={props => <List.Icon {...props} icon="food" />}
            />

            <List.Item
              title="Uso Exclusivo dos Canais do App"
              description="Pedidos, alterações, cancelamentos e combinados relacionados às encomendas devem ser tratados pelo App e seus canais internos, incluindo o chat, para garantir rastreabilidade e segurança."
              left={props => <List.Icon {...props} icon="cellphone-link" />}
            />

            <List.Item
              title="Proibição de Desvio de Clientes"
              description="É proibido solicitar que o Cliente finalize pedidos ou pagamentos fora do App, assim como incentivar contato direto com o objetivo de contornar a plataforma. O descumprimento pode resultar em advertência, suspensão ou encerramento da conta."
              left={props => <List.Icon {...props} icon="account-cancel" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader testID="section-IV. Política para Entregadores">
              IV. Política para Entregadores
            </List.Subheader>

            <List.Item
              testID="list-item-cadastro-documentacao-entregador"
              title="Cadastro e Documentação"
              description="O Entregador deve manter sua documentação atualizada (CPF, RG, CNH e demais documentos exigidos), bem como dados de contato e meios de pagamento."
              left={props => <List.Icon {...props} icon="bike-fast" />}
            />

            <List.Item
              testID="list-item-entrega-responsabilidade"
              title="Entrega e Responsabilidade"
              description="O Entregador é responsável pela retirada, transporte e entrega dos pedidos, obedecendo às orientações do App e do Produtor, bem como à legislação de trânsito aplicável."
              left={props => <List.Icon {...props} icon="package-variant" />}
            />

            <List.Item
              title="Comunicação via App"
              description="Dúvidas, imprevistos de rota e ajustes na entrega devem ser comunicados preferencialmente pelos canais internos do App, mantendo registro das interações sempre que possível."
              left={props => <List.Icon {...props} icon="message-alert" />}
            />

            <List.Item
              title="Vedação de Acordos Paralelos"
              description="O Entregador não deve negociar valores, rotas ou entregas extras diretamente com Cliente ou Produtor com a intenção de burlar a plataforma, sob pena de sanções e eventual desligamento."
              left={props => <List.Icon {...props} icon="shield-alert" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader testID="section-V. Termos Gerais">
              V. Termos Gerais
            </List.Subheader>

            <List.Item
              testID="list-item-conteudo-uso"
              title="Conteúdo e Uso"
              description="É vedado o uso do App para fins ilícitos, ofensivos, discriminatórios ou que violem direitos de terceiros, incluindo o envio de mensagens abusivas nos chats internos."
              left={props => <List.Icon {...props} icon="shield-check" />}
            />

            <List.Item
              testID="list-item-privacidade-dados"
              title="Privacidade e Dados"
              description="O tratamento de dados pessoais observará a legislação aplicável de proteção de dados. Usuários se comprometem a não coletar, armazenar ou reutilizar dados obtidos via App para fins incompatíveis com a finalidade da plataforma."
              left={props => <List.Icon {...props} icon="lock" />}
            />

            <List.Item
              title="Negociações Fora da Plataforma"
              description="A plataforma não se responsabiliza por negociações, pagamentos ou entregas combinadas e executadas totalmente fora do App. Tais atos são de risco exclusivo das partes envolvidas e podem motivar medidas disciplinares quando identificados."
              left={props => <List.Icon {...props} icon="alert-octagon" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader testID="section-VI. Contato e Suporte">
              VI. Contato e Suporte
            </List.Subheader>

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

          <Text variant="bodySmall" style={styles.footer} testID="terms-footer">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function PrivacyPolicyScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <RNText style={styles.title}>
            Política de Privacidade
          </RNText>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Açucaradas Encomendas
          </Text>

          <Text variant="bodyMedium" style={styles.intro}>
            Esta Política de Privacidade descreve como o aplicativo "Açucaradas Encomendas"
            coleta, utiliza, armazena e protege os dados pessoais de compradores, produtores e
            entregadores que utilizam a plataforma.
          </Text>

          <List.Section>
            <List.Subheader>
              I. Controlador dos Dados e Escopo
            </List.Subheader>

            <List.Item
              title="Responsável pelo tratamento"
              description="Os dados pessoais são tratados pela operação responsável pelo aplicativo 'Açucaradas Encomendas', que atua como controladora das informações necessárias ao funcionamento da plataforma."
              left={props => <List.Icon {...props} icon="account-lock" />}
            />

            <List.Item
              title="Abrangência"
              description="Esta política se aplica a todos os usuários do App, incluindo clientes, produtores, entregadores e administradores que acessam ou utilizam qualquer funcionalidade disponibilizada."
              left={props => <List.Icon {...props} icon="account-group" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>
              II. Dados Coletados
            </List.Subheader>

            <List.Item
              title="Dados de cadastro"
              description="Nome, e-mail, telefone, documento de identificação (CPF/CNPJ quando aplicável), endereço e demais informações fornecidas pelo próprio usuário para criação e manutenção da conta."
              left={props => <List.Icon {...props} icon="form-textbox" />}
            />

            <List.Item
              title="Dados de uso da plataforma"
              description="Registros de pedidos, interações no chat, avaliações, notificações recebidas, dados de navegação e informações sobre como o App é utilizado, com foco em melhoria contínua da experiência."
              left={props => <List.Icon {...props} icon="cellphone-information" />}
            />

            <List.Item
              title="Dados de localização"
              description="Quando autorizado pelo usuário, coletamos dados de localização aproximada para permitir cálculo de rotas, estimativa de entrega e exibição de lojas próximas."
              left={props => <List.Icon {...props} icon="map-marker" />}
            />

            <List.Item
              title="Dados de dispositivo"
              description="Informações técnicas do dispositivo, como modelo, sistema operacional, identificadores de notificação push e logs necessários para prevenção de fraude, segurança e suporte."
              left={props => <List.Icon {...props} icon="cellphone-lock" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>
              III. Finalidades do Tratamento
            </List.Subheader>

            <List.Item
              title="Operação do App"
              description="Viabilizar cadastro, login, autenticação em duas etapas, criação e gestão de pedidos, comunicação entre usuários e demais funcionalidades centrais do aplicativo."
              left={props => <List.Icon {...props} icon="cog" />}
            />

            <List.Item
              title="Segurança e prevenção a fraudes"
              description="Monitorar atividades suspeitas, proteger contas de acesso não autorizado, prevenir golpes e abusos da plataforma, inclusive mediante registros de logs de segurança."
              left={props => <List.Icon {...props} icon="shield-lock" />}
            />

            <List.Item
              title="Comunicações essenciais"
              description="Enviar notificações sobre status de pedidos, alterações relevantes, alertas de segurança e mensagens necessárias para o uso adequado do App."
              left={props => <List.Icon {...props} icon="bell" />}
            />

            <List.Item
              title="Análises e melhorias"
              description="Utilizar métricas de uso de forma agregada para entender desempenho, corrigir falhas, aprimorar funcionalidades e desenvolver novos recursos alinhados às necessidades dos usuários."
              left={props => <List.Icon {...props} icon="chart-line" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>
              IV. Compartilhamento de Dados
            </List.Subheader>

            <List.Item
              title="Outros usuários da plataforma"
              description="Dados necessários para execução de pedidos podem ser compartilhados entre clientes, produtores e entregadores (como nome, endereço de entrega e informações de contato) de forma limitada ao contexto da transação."
              left={props => <List.Icon {...props} icon="account-arrow-right" />}
            />

            <List.Item
              title="Prestadores de serviços terceiros"
              description="Podemos utilizar serviços de infraestrutura, meios de pagamento, notificações push, mapas e monitoramento que tratam dados apenas conforme nossas instruções e políticas de segurança."
              left={props => <List.Icon {...props} icon="server" />}
            />

            <List.Item
              title="Obrigação legal e proteção de direitos"
              description="Dados podem ser compartilhados com autoridades competentes quando necessário para cumprimento de obrigações legais, ordens judiciais ou defesa de direitos da plataforma e de seus usuários."
              left={props => <List.Icon {...props} icon="gavel" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>
              V. Direitos do Titular de Dados
            </List.Subheader>

            <List.Item
              title="Acesso e correção"
              description="O usuário pode acessar e atualizar dados cadastrais diretamente no App, bem como solicitar correções de informações incorretas ou desatualizadas."
              left={props => <List.Icon {...props} icon="account-edit" />}
            />

            <List.Item
              title="Revogação de consentimentos"
              description="Configurações como notificações, marketing e visibilidade de perfil podem ser ajustadas nas telas de privacidade e configurações da conta, respeitando limites técnicos e legais."
              left={props => <List.Icon {...props} icon="toggle-switch" />}
            />

            <List.Item
              title="Exclusão de conta"
              description="O usuário pode solicitar a exclusão da conta. Alguns dados poderão ser mantidos pelo período necessário para cumprimento de obrigações legais, prevenção de fraudes e registros de segurança."
              left={props => <List.Icon {...props} icon="trash-can" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>
              VI. Segurança da Informação
            </List.Subheader>

            <List.Item
              title="Medidas técnicas e organizacionais"
              description="Empregamos práticas razoáveis de segurança, como controle de acesso, criptografia em trânsito, monitoramento de sessões e medidas de proteção contra uso não autorizado da conta."
              left={props => <List.Icon {...props} icon="shield-check" />}
            />

            <List.Item
              title="Responsabilidade do usuário"
              description="O usuário deve manter credenciais em sigilo, utilizar senhas fortes, ativar recursos de segurança disponíveis (como autenticação em duas etapas) e notificar a plataforma em caso de suspeita de uso indevido."
              left={props => <List.Icon {...props} icon="alert-circle" />}
            />
          </List.Section>

          <Divider style={styles.divider} />

          <List.Section>
            <List.Subheader>
              VII. Contato e Atualizações
            </List.Subheader>

            <List.Item
              title="Canal de contato"
              description="Dúvidas sobre privacidade, solicitações de direitos ou questões relacionadas ao tratamento de dados podem ser encaminhadas para o canal de suporte indicado nas telas de ajuda do aplicativo."
              left={props => <List.Icon {...props} icon="email" />}
            />

            <List.Item
              title="Atualizações desta política"
              description="Esta Política de Privacidade pode ser atualizada para refletir mudanças legais ou evoluções do App. Sempre que houver alteração relevante, poderemos comunicar pelos canais internos ou notificações."
              left={props => <List.Icon {...props} icon="update" />}
            />
          </List.Section>

          <Text variant="bodySmall" style={styles.footer}>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#666',
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
    color: '#666',
  },
});
