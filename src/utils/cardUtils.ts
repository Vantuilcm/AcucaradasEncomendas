export const detectCardBrand = (cardNumber: string): string => {
  const number = cardNumber.replace(/\s/g, '');

  // Visa
  if (/^4/.test(number)) {
    return 'Visa';
  }

  // Mastercard
  if (/^5[1-5]/.test(number)) {
    return 'Mastercard';
  }

  // American Express
  if (/^3[47]/.test(number)) {
    return 'American Express';
  }

  // Discover
  if (/^6(?:011|5)/.test(number)) {
    return 'Discover';
  }

  // Diners Club
  if (/^3(?:0[0-5]|[68])/.test(number)) {
    return 'Diners Club';
  }

  // JCB
  if (/^(?:2131|1800|35\d{3})/.test(number)) {
    return 'JCB';
  }

  // Hipercard
  if (/^384(?:100|140|400|000)/.test(number)) {
    return 'Hipercard';
  }

  // Elo
  if (/^636368|^438935|^504175|^451416|^636297|^5067|^4576|^4011/.test(number)) {
    return 'Elo';
  }

  return 'Unknown';
};

export const formatCardNumber = (number: string): string => {
  const cleaned = number.replace(/\s/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
};

export const formatExpiryDate = (date: string): string => {
  const cleaned = date.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
  return cleaned;
};

export const maskCardNumber = (number: string): string => {
  const cleaned = number.replace(/\s/g, '');
  return `•••• •••• •••• ${cleaned.slice(-4)}`;
};
