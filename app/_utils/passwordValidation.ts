export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Heslo musí mít alespoň 8 znaků';
  if (!/[A-Z]/.test(password)) return 'Heslo musí obsahovat alespoň jedno velké písmeno';
  if (!/[0-9]/.test(password)) return 'Heslo musí obsahovat alespoň jednu číslici';
  return null;
}
