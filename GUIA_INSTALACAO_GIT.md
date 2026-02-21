# Guia de Instalação do Git

Este guia apresenta o passo a passo para instalar o Git no Windows, necessário para o funcionamento completo do EAS (Expo Application Services) e builds do aplicativo Açucaradas Encomendas.

## 1. Download do Git para Windows

1. Acesse o site oficial do Git: [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. O download deve iniciar automaticamente para a versão mais recente compatível com seu sistema
3. Caso não inicie, clique no link "Click here to download manually"

## 2. Instalação do Git

1. Execute o arquivo baixado (Ex: Git-2.40.1-64-bit.exe)
2. Aceite a licença e clique em "Next"
3. Mantenha o local de instalação padrão e clique em "Next"
4. Na tela de seleção de componentes, mantenha as opções padrão e certifique-se de que:
   - "Git Bash Here" está selecionado
   - "Git GUI Here" está selecionado
   - "Git LFS (Large File Support)" está selecionado
   - "Associate .git\* files with default editor" está selecionado
5. Clique em "Next"
6. Na tela "Select Start Menu Folder", mantenha o padrão "Git" e clique em "Next"
7. Na tela "Choosing the default editor", selecione o editor de sua preferência (recomendamos VSCode) e clique em "Next"
8. Na tela de ajuste do PATH, selecione "Git from the command line and also from 3rd-party software" e clique em "Next"
9. Na tela "Choosing HTTPS transport backend", selecione "Use the OpenSSL library" e clique em "Next"
10. Na tela "Configuring the line ending conversions", selecione "Checkout Windows-style, commit Unix-style line endings" e clique em "Next"
11. Na tela "Configuring the terminal emulator", selecione "Use MinTTY" e clique em "Next"
12. Na tela "Choose the default behavior of 'git pull'", selecione "Default" e clique em "Next"
13. Na tela "Choose a credential helper", selecione "Git Credential Manager" e clique em "Next"
14. Mantenha as configurações extras padrão e clique em "Next"
15. Na tela de configurações experimentais, não selecione nada e clique em "Install"
16. Aguarde a conclusão da instalação e clique em "Finish"

## 3. Verificação da Instalação

1. Abra o Prompt de Comando (cmd) ou PowerShell
2. Digite o seguinte comando para verificar se o Git foi instalado corretamente:
   ```
   git --version
   ```
3. O comando deve retornar a versão do Git instalada, por exemplo: `git version 2.40.1.windows.1`

## 4. Configuração Inicial do Git

1. Configure seu nome de usuário:
   ```
   git config --global user.name "Seu Nome"
   ```
2. Configure seu email:
   ```
   git config --global user.email "seu.email@exemplo.com"
   ```
3. Verifique suas configurações:
   ```
   git config --list
   ```

## 5. Integração com o EAS

Para garantir que o Git funcione corretamente com o EAS (Expo Application Services):

1. Certifique-se de que a pasta do projeto esteja inicializada como um repositório Git:
   ```
   cd caminho/para/acucaradas-encomendas
   git status
   ```
2. Se não estiver inicializado, execute:
   ```
   git init
   git add .
   git commit -m "Inicialização do repositório"
   ```
3. Verifique se o arquivo `.gitignore` inclui as seguintes entradas:
   ```
   node_modules/
   .expo/
   dist/
   npm-debug.*
   *.jks
   *.p8
   *.p12
   *.key
   *.mobileprovision
   *.orig.*
   web-build/
   ```

## 6. Problemas Comuns e Soluções

### Erro de Autorização ao fazer push/pull

- Verifique suas credenciais com: `git config --list`
- Redefina as credenciais com: `git credential-manager uninstall` seguido de `git credential-manager install`

### Erros de LF/CRLF (Line Endings)

- Para corrigir: `git config --global core.autocrlf true` (no Windows)

### Conflitos com Outros Sistemas de Controle de Versão

- Remova ferramentas concorrentes ou configure-as para não interferir no Git

## 7. Recursos Adicionais

- [Documentação oficial do Git](https://git-scm.com/doc)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Tutorial interativo do GitHub](https://lab.github.com/)

---

Em caso de dúvidas ou problemas durante a instalação, entre em contato com a equipe de suporte.
