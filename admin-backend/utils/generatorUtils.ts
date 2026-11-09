export function generateCleanId(name?: string): string {
  const slug = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `t_${slug || 'unit'}_${random}`;
}

export function generateStructuredUsername(baseSlug?: string): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  if (baseSlug && baseSlug.trim()) {
    const clean = baseSlug.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (clean.length >= 3) {
      return `${clean}_${randomSuffix}`;
    }
  }
  return `tenant_${randomSuffix}`;
}

export function generateRandomPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let gen = 'pass_';
  for (let i = 0; i < 6; i++) {
    gen += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return gen;
}
