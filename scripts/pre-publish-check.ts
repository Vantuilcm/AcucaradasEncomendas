#!/usr/bin/env node
/**
 * Scripts para verificação pré-publicação do aplicativo Açucaradas Encomendas
 *
 * Como usar:
 * npm run pre-publish-check
 */

import { checkLegalDocumentsAvailability } from '../src/utils/legalDocuments';
import { verifyDomainConfiguration, runDomainDiagnostics } from '../src/utils/domainVerifier';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Código de cores para output no terminal
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

/**
 * Formata a mensagem com cores
 */
const format = {
  success: (msg: string) => `${colors.green}✓ ${msg}${colors.reset}`,
  error: (msg: string) => `${colors.red}✗ ${msg}${colors.reset}`,
  warning: (msg: string) => `${colors.yellow}⚠ ${msg}${colors.reset}`,
  info: (msg: string) => `${colors.blue}ℹ ${msg}${colors.reset}`,
  header: (msg: string) => `${colors.bold}${msg}${colors.reset}`,
};

/**
 * Verifica a disponibilidade dos documentos legais
 */
async function checkLegalDocuments() {
  console.log(format.header('\nVerificando documentos legais...'));

  try {
    const availability = await checkLegalDocumentsAvailability();

    if (availability.privacyPolicy && availability.termsOfUse && availability.website) {
      console.log(format.success('Todos os documentos legais estão acessíveis.'));
      return true;
    } else {
      if (!availability.website) {
        console.log(format.error('O site principal não está acessível!'));
      }
      if (!availability.privacyPolicy) {
        console.log(format.error('A Política de Privacidade não está acessível!'));
      }
      if (!availability.termsOfUse) {
        console.log(format.error('Os Termos de Uso não estão acessíveis!'));
      }

      console.log(format.info('Executando diagnóstico avançado...'));
      const diagnostics = await runDomainDiagnostics();
      console.log(JSON.stringify(diagnostics, null, 2));

      return false;
    }
  } catch (error) {
    console.log(format.error(`Erro ao verificar documentos legais: ${error}`));
    return false;
  }
}

/**
 * Verifica se os URLs no app.json estão configurados corretamente
 */
async function checkAppJsonConfiguration() {
  console.log(format.header('\nVerificando configuração do app.json...'));

  try {
    const appJsonPath = path.join(process.cwd(), 'app.json');
    const appJsonContent = await fs.readFile(appJsonPath, 'utf8');
    const appJson = JSON.parse(appJsonContent);

    const privacyPolicyUrl = appJson.expo?.privacyPolicyUrl;
    const termsOfServiceUrl = appJson.expo?.termsOfServiceUrl;

    if (!privacyPolicyUrl) {
      console.log(format.error('Não foi encontrado o privacyPolicyUrl no app.json!'));
      return false;
    }

    if (!termsOfServiceUrl) {
      console.log(format.error('Não foi encontrado o termsOfServiceUrl no app.json!'));
      return false;
    }

    if (!privacyPolicyUrl.startsWith('https://')) {
      console.log(format.error('O privacyPolicyUrl deve começar com https://'));
      return false;
    }

    if (!termsOfServiceUrl.startsWith('https://')) {
      console.log(format.error('O termsOfServiceUrl deve começar com https://'));
      return false;
    }

    console.log(
      format.success('URLs dos documentos legais configurados corretamente no app.json.')
    );
    return true;
  } catch (error) {
    console.log(format.error(`Erro ao verificar app.json: ${error}`));
    return false;
  }
}

/**
 * Função principal para executar todas as verificações
 */
async function runPrePublishChecks() {
  console.log(format.header('Iniciando verificações pré-publicação...'));

  let allChecksPass = true;

  // Verificar configuração do app.json
  const appJsonCheck = await checkAppJsonConfiguration();
  allChecksPass = allChecksPass && appJsonCheck;

  // Verificar documentos legais
  const legalDocsCheck = await checkLegalDocuments();
  allChecksPass = allChecksPass && legalDocsCheck;

  // Verificar domínio e URLs
  console.log(format.header('\nVerificando configuração do domínio...'));
  const domainVerification = await verifyDomainConfiguration();

  if (domainVerification.status === 'success') {
    console.log(format.success(domainVerification.message));
  } else if (domainVerification.status === 'warning') {
    console.log(format.warning(domainVerification.message));
    console.log(format.info(`Tempo de resposta: ${domainVerification.details.responseTimeMs}ms`));
  } else {
    console.log(format.error(domainVerification.message));
    allChecksPass = false;
  }

  // Resultado final
  console.log('\n' + format.header('Resultado das verificações:'));
  if (allChecksPass) {
    console.log(format.success('Todas as verificações passaram com sucesso!'));
    console.log(format.info('O aplicativo está pronto para ser publicado.'));
  } else {
    console.log(format.error('Algumas verificações falharam!'));
    console.log(format.info('Corrija os problemas antes de prosseguir com a publicação.'));
    process.exit(1);
  }
}

// Executar verificações
runPrePublishChecks().catch(error => {
  console.error(format.error(`Erro inesperado: ${error}`));
  process.exit(1);
});
