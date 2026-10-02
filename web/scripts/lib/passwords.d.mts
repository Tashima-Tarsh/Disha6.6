export function validatePassword(password: string): void;
export function hashPassword(password: string): Promise<string>;
export function verifyPassword(password: string, encoded: string | null | undefined): Promise<boolean>;
