import crypto from 'crypto';

/**
 * This is not solid encryption, however, this is not the goal.
 * The class can be used to encrypt the filename with a key that is linked to the logged in user
 * This way the permission is checked, because the encryptionkey is the session of the user with the correct permission for this file.
 * It enables passing the filename in the url and preventing other users from downloading a file by guessing the filename in the url.
 */
export class EncryptFilename {

  /**
   * Generates a random AES-128 key as a base64-encoded string.
   * @returns The key as a base64-encoded string.
   */
  public static generateKey(): string {
    console.log('IV', this.IV);
    return crypto.randomBytes(16).toString('base64'); // 16 bytes for AES-128
  }

  /**
   * Encrypts a UTF-8 string using the provided base64-encoded key.
   * @param key - The base64-encoded key.
   * @param text - The UTF-8 string to encrypt.
   * @returns The encrypted text as a base64-encoded string.
   */
  public static encrypt(key: string, text: string): string {
    const keyBuffer = Buffer.from(key, 'base64');
    const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, this.IV);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  /**
   * Decrypts a base64-encoded encrypted text using the provided base64-encoded key.
   * @param key - The base64-encoded key.
   * @param encryptedText - The base64-encoded encrypted text.
   * @returns The decrypted UTF-8 string.
   */
  public static decrypt(key: string, encryptedText: string): string {
    const keyBuffer = Buffer.from(key, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, this.IV);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private static readonly ALGORITHM = 'aes-128-cbc'; // Updated to AES-128
  private static readonly IV = Buffer.from('0780f832cced8cbe1e6b5e4a6c2281a1', 'hex'); // 16-byte hardcoded IV
}


