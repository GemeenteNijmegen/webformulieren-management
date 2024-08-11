import crypto from 'crypto';

/**
 * This is not solid encryption, however, this is not the goal.
 * The class can be used to encrypt the filename with a key that is linked to the logged in user.
 * This way the permission is checked, because the encryption key is the session of the user with the correct permission for this file.
 * It enables passing the filename in the URL and preventing other users from downloading a file by guessing the filename in the URL.
 */
export class EncryptFilename {

  /**
   * Generates a random AES-128 key as a hex-encoded string.
   * @returns The key as a hex-encoded string.
   */
  public static generateKey(): string {
    return crypto.randomBytes(16).toString('hex'); // 16 bytes for AES-128
  }

  /**
   * Encrypts a UTF-8 string using the provided hex-encoded key.
   * @param key - The hex-encoded key.
   * @param text - The UTF-8 string to encrypt.
   * @returns The encrypted text as a base64-encoded string.
   */
  public static async encrypt(key: string, text: string): Promise<string> {
    const keyBuffer = Buffer.from(key, 'hex');
    const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, this.IV);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  /**
   * Decrypts a base64-encoded encrypted text using the provided hex-encoded key.
   * @param key - The hex-encoded key.
   * @param encryptedText - The base64-encoded encrypted text.
   * @returns The decrypted UTF-8 string.
   */
  public static async decrypt(key: string, encryptedText: string): Promise<string> {
    const keyBuffer = Buffer.from(key, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, this.IV);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private static readonly ALGORITHM = 'aes-128-cbc'; // AES-128 algorithm
  private static readonly IV = Buffer.from('0780f832cced8cbe1e6b5e4a6c2281a1', 'hex'); // Static 16-byte IV
}
