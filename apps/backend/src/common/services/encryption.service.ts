import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ENCRYPTION_CONFIG } from '../constants/encryption.constants';
import { ERROR_MESSAGES } from '../constants/messages.constants';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length !== ENCRYPTION_CONFIG.KEY_LENGTH) {
      throw new Error(ERROR_MESSAGES.INVALID_ENCRYPTION_KEY);
    }
    this.key = Buffer.from(encryptionKey, ENCRYPTION_CONFIG.ENCODING.INPUT);
  }

  encrypt(text: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.ALGORITHM,
      this.key,
      iv
    );
    let encrypted = cipher.update(text, ENCRYPTION_CONFIG.ENCODING.INPUT, ENCRYPTION_CONFIG.ENCODING.OUTPUT);
    encrypted += cipher.final(ENCRYPTION_CONFIG.ENCODING.OUTPUT);
    return {
      encrypted,
      iv: iv.toString(ENCRYPTION_CONFIG.ENCODING.OUTPUT),
    };
  }

  decrypt(encrypted: string, iv: string): string {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.ALGORITHM,
      this.key,
      Buffer.from(iv, ENCRYPTION_CONFIG.ENCODING.OUTPUT)
    );
    let decrypted = decipher.update(encrypted, ENCRYPTION_CONFIG.ENCODING.OUTPUT, ENCRYPTION_CONFIG.ENCODING.INPUT);
    decrypted += decipher.final(ENCRYPTION_CONFIG.ENCODING.INPUT);
    return decrypted;
  }
}
