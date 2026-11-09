export function formatIndonesianPhone(phone: string): { display: string; cleanDigits: string } {
  if (!phone) return { display: '', cleanDigits: '' };
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  } else if (!clean.startsWith('62') && clean.length > 0) {
    clean = '62' + clean;
  }
  return {
    display: clean ? `+${clean}` : '',
    cleanDigits: clean,
  };
}
