export const PASSWORD_POLICY =
  "At least 8 characters, including a letter, a number, and a special character.";

export function isValidPassword(pw) {
  if (!pw || pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/\d/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}
