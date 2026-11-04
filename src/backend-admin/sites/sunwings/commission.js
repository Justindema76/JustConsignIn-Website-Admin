// Justin's commission on Sunwings jobs: 10% on jobs up to $800, 20% on jobs over $800.
// A job can override the rate (commission_rate) or be marked "no commission".

export const COMMISSION_THRESHOLD = 800;

export function autoCommissionRate(price) {
  return Number(price) > COMMISSION_THRESHOLD ? 20 : 10;
}

// The job's price: what the customer paid, else Marius's price, else Justin's quote.
export function jobPrice(request) {
  for (const value of [request?.final_price, request?.partner_price, request?.quote_amount]) {
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

export function commissionFor(request) {
  const price = jobPrice(request);
  if (price === null || request?.commission_status === 'none') return { price, rate: 0, amount: 0 };
  const custom = request?.commission_rate;
  const rate = custom !== null && custom !== undefined && custom !== '' ? Number(custom) : autoCommissionRate(price);
  return { price, rate, amount: Math.round(price * rate) / 100 };
}

export function money(value) {
  const number = Number(value) || 0;
  return '$' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
