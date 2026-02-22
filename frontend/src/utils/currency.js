// Currency formatting utilities

export function formatCurrency(amount, currency) {
  const formattedAmount = amount?.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  
  if (!currency) return formattedAmount;
  
  const currencyLower = currency.toLowerCase();
  
  if (currencyLower === 'dolares' || currencyLower === 'dólares' || currencyLower === 'usd') {
    return `${formattedAmount} USD`;
  } else {
    // Pesos or any other currency
    return `$${formattedAmount}`;
  }
}

export function getCurrencyColor(currency) {
  if (!currency) return '#000000';
  
  const currencyLower = currency.toLowerCase();
  
  if (currencyLower === 'dolares' || currencyLower === 'dólares' || currencyLower === 'usd') {
    return '#059669'; // Green for dollars
  } else {
    // Pesos or any other currency
    return '#2563eb'; // Blue for pesos
  }
}

export function getCurrencyStyle(currency) {
  return {
    color: getCurrencyColor(currency),
    fontWeight: 500
  };
}
