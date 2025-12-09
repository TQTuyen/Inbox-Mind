export interface ITokenGenerator {
  generateAccessToken(userId: string, email: string): string;
  generateRefreshToken(userId: string): string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ITokenValidator {
  validateAccessToken(token: string): Promise<any>;
  validateRefreshToken(token: string): Promise<any>;
}
