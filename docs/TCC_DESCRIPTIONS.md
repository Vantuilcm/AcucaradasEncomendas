# Descrições do Sistema para TCC - Açucaradas Encomendas

Este documento contém as descrições do sistema em diferentes níveis de complexidade, conforme solicitado para a documentação do TCC.

---

## 🛠️ 1. Descrição Técnica (Foco em Engenharia e Arquitetura)
**Público-alvo:** Avaliadores técnicos, desenvolvedores e arquitetos de software.

O sistema **Açucaradas Encomendas** é uma plataforma mobile multiplataforma desenvolvida com o ecossistema **React Native** e **Expo (SDK 52+)**. A arquitetura é baseada em microsserviços serverless utilizando **Firebase (Firestore, Auth, Storage, Cloud Functions)**, garantindo escalabilidade horizontal e baixa latência.

### Principais Diferenciais Técnicos:
- **Build System (RellBuild):** Implementação de uma esteira de CI/CD via **GitHub Actions** utilizando runners **macOS** para builds nativos gratuitos e determinísticos (Android AAB e iOS IPA) sem dependência de planos pagos do EAS Cloud.
- **Inteligência de Mercado:** Utilização de serviços de IA para **Demand Forecast** (Previsão de Demanda) e **Dynamic Pricing** (Precificação Dinâmica), otimizando a receita dos produtores com base em sazonalidade e volume de pedidos.
- **Segurança Financeira:** Integração com **Stripe Connect** para split de pagamentos em tempo real entre plataforma, produtores e entregadores, garantindo conformidade com normas bancárias.
- **Comunicação em Tempo Real:** Sistema de notificações push via **OneSignal** e mensageria interna para acompanhamento de pedidos.
- **Design System:** Tema premium centralizado via hook customizado (`useAppTheme`), suportando Dark Mode nativo e acessibilidade de alto contraste.

---

## 💼 2. Descrição Executiva (Foco em Negócio e Valor)
**Público-alvo:** Investidores, stakeholders e gestores de produto.

O **Açucaradas Encomendas** é um marketplace premium focado no setor de confeitaria artesanal. O objetivo central é digitalizar produtores locais, oferecendo uma experiência de compra de alto nível que rivaliza com grandes plataformas de delivery, mas com foco exclusivo em nichos de alta qualidade.

### Proposta de Valor:
- **Redução de Custos Operacionais:** Através do sistema **RellBuild**, eliminamos custos recorrentes de infraestrutura de build mobile, permitindo o reinvestimento desses recursos em marketing e expansão.
- **Ecossistema Sustentável:** O split financeiro automatizado garante que todos os envolvidos (confeiteiros e entregadores) recebam de forma rápida e segura, aumentando a retenção de parceiros.
- **Experiência do Cliente:** Uma interface moderna e fluida, com identidade visual "Premium Violet", que eleva o valor percebido dos produtos artesanais.
- **Visibilidade e Dados:** Painéis de monitoramento em tempo real permitem que administradores tomem decisões baseadas em dados de demanda e performance de entrega.

---

## 🍰 3. Descrição Simples (Foco em Usuário Final)
**Público-alvo:** Clientes e usuários gerais do aplicativo.

O **Açucaradas Encomendas** é o seu novo aplicativo favorito para encontrar e encomendar os melhores doces e sobremesas artesanais da sua região. Sabe aquele bolo de festa perfeito ou aquele doce caseiro que você só encontra em feiras especiais? Agora eles estão na palma da sua mão.

### Por que usar o Açucaradas?
- **Doces Exclusivos:** Tenha acesso a produtos feitos com carinho por confeiteiros locais que você não encontra em outros apps.
- **Acompanhamento Passo a Passo:** Saiba exatamente quando seu pedido está sendo preparado, quando saiu para entrega e quem é o entregador.
- **Pagamento Fácil e Seguro:** Pague com cartão de crédito de forma rápida e sem preocupações.
- **Visual Incrível:** Um aplicativo bonito, fácil de usar e que funciona perfeitamente tanto no claro quanto no escuro.

---
*Documentação gerada automaticamente pelo agente RellBuild em 26/03/2026.*