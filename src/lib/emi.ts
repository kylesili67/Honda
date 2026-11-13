export interface EmiCalculationResult {
  vehiclePrice: number;
  downPayment: number;
  downPaymentPercent: number;
  financedAmount: number;
  tenureMonths: number;
  markupRatePercentPerYear: number;
  totalMarkup: number;
  totalPayable: number;
  monthlyInstallment: number;
}

/**
 * PRD Business Rule 4:
 * monthly = (price - down_payment) * (1 + markup_rate * years) / months
 */
export function calculateEMI(
  price: number,
  downPayment: number,
  tenureMonths: number,
  markupRatePercentPerYear: number
): EmiCalculationResult {
  const safePrice = Math.max(0, price);
  const safeDown = Math.min(safePrice, Math.max(0, downPayment));
  const safeMonths = Math.max(1, tenureMonths);
  const years = safeMonths / 12;
  const markupRateDecimal = Math.max(0, markupRatePercentPerYear) / 100;
  const principal = safePrice - safeDown;
  const totalPayable = principal * (1 + markupRateDecimal * years);
  const monthlyInstallment = totalPayable / safeMonths;

  return {
    vehiclePrice: safePrice,
    downPayment: safeDown,
    downPaymentPercent: safePrice > 0 ? Math.round((safeDown / safePrice) * 100) : 0,
    financedAmount: principal,
    tenureMonths: safeMonths,
    markupRatePercentPerYear,
    totalMarkup: Math.max(0, totalPayable - principal),
    totalPayable,
    monthlyInstallment,
  };
}
