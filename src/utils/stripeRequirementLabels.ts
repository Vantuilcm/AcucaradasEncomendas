const STRIPE_REQUIREMENT_LABELS: Record<string, string> = {
  'individual.verification.document': 'Documento de identidade',
  'individual.verification.additional_document': 'Documento adicional',
  'individual.id_number': 'CPF',
  'individual.first_name': 'Nome',
  'individual.last_name': 'Sobrenome',
  'individual.email': 'E-mail',
  'individual.phone': 'Telefone',
  'individual.dob.day': 'Data de nascimento (dia)',
  'individual.dob.month': 'Data de nascimento (mês)',
  'individual.dob.year': 'Data de nascimento (ano)',
  'individual.address.line1': 'Endereço',
  'individual.address.city': 'Cidade',
  'individual.address.state': 'Estado',
  'individual.address.postal_code': 'CEP',
  'business_profile.url': 'Site ou rede social da loja',
  'business_profile.mcc': 'Categoria comercial',
  'external_account': 'Conta bancária para repasses',
  'tos_acceptance.date': 'Aceite dos termos Stripe',
  'tos_acceptance.ip': 'Aceite dos termos Stripe',
  'company.tax_id': 'CNPJ',
  'company.verification.document': 'Documento da empresa',
};

export function formatStripeRequirement(code: string): string {
  if (STRIPE_REQUIREMENT_LABELS[code]) {
    return STRIPE_REQUIREMENT_LABELS[code];
  }

  const simplified = code
    .replace(/^individual\./, '')
    .replace(/^company\./, '')
    .replace(/\./g, ' › ')
    .replace(/_/g, ' ');

  return simplified.charAt(0).toUpperCase() + simplified.slice(1);
}
