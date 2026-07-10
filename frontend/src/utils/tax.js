export const TAX_MODE_CGST_SGST = "cgst_sgst";
export const TAX_MODE_IGST = "igst";

/** Mirror of backend TaxCalculator::apply for live bill preview. */
export function applyTax(amount, config = {}) {
  const enabled = Boolean(config.enabled);
  const mode = config.mode || TAX_MODE_CGST_SGST;
  const rate = Math.max(0, Number(config.rate) || 0);
  const inclusive = Boolean(config.inclusive);

  const base = {
    tax_enabled: false,
    tax_mode: null,
    tax_rate: 0,
    tax_inclusive: false,
    taxable_amount: round2(Math.max(0, amount)),
    cgst_rate: 0,
    sgst_rate: 0,
    igst_rate: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    tax_amount: 0,
    grand_total: round2(Math.max(0, amount)),
  };

  if (!enabled || rate <= 0) {
    return base;
  }

  let taxable;
  let taxTotal;
  let grand;

  if (inclusive) {
    taxable = round2(amount / (1 + rate / 100));
    taxTotal = round2(amount - taxable);
    grand = round2(amount);
  } else {
    taxable = round2(Math.max(0, amount));
    taxTotal = round2(taxable * (rate / 100));
    grand = round2(taxable + taxTotal);
  }

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (mode === TAX_MODE_IGST) {
    igstRate = rate;
    igstAmount = taxTotal;
  } else {
    const halfRate = round2(rate / 2);
    cgstRate = halfRate;
    sgstRate = halfRate;
    cgstAmount = round2(taxTotal / 2);
    sgstAmount = round2(taxTotal - cgstAmount);
  }

  return {
    tax_enabled: true,
    tax_mode: mode,
    tax_rate: rate,
    tax_inclusive: inclusive,
    taxable_amount: taxable,
    cgst_rate: cgstRate,
    sgst_rate: sgstRate,
    igst_rate: igstRate,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    tax_amount: taxTotal,
    grand_total: grand,
  };
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
