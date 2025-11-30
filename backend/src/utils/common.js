export const nextId = (arr) => (Array.isArray(arr) && arr.length ? (arr[arr.length - 1]?.id || 0) : 0) + 1;

export const normalizeSupplierPayload = (body) => {
  const name = body.name;
  const email = body.email ?? null;
  const phone = body.phone ?? null;
  const address = body.address ?? null;
  const bank_name = body.bank_name ?? body.bankName ?? null;
  const iban = body.iban ?? body.ibanNumber ?? null;
  const tax_number = body.tax_number ?? body.taxNumber ?? null;
  return { name, email, phone, address, bank_name, iban, tax_number };
};
