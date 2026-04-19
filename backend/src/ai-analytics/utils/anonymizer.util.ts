import * as crypto from 'crypto';

/**
 * Utility to anonymize PII (Personally Identifiable Information) 
 * for AI processing and logging.
 */
export class AnonymizerUtil {
  /**
   * Replaces sensitive identifiers with a consistent token.
   * @param value The raw string (email, ID, name)
   * @param salt Optional salt for hashing
   */
  static tokenize(value: string, salt: string = 'vsakha-ai-salt'): string {
    if (!value) return '';
    
    // Create a 8-character consistent hash
    const hash = crypto
      .createHash('sha256')
      .update(value + salt)
      .digest('hex')
      .substring(0, 8);
    
    return `token_${hash}`;
  }

  /**
   * Partially masks an email for minimal visibility
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return 'masked_email';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `*@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  /**
   * Anonymizes a whole object recursively (optional, for logs)
   */
  static anonymizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = { ...obj };
    const piiKeys = ['studentId', 'email', 'studentEmail', 'studentName', 'author'];
    
    for (const key of Object.keys(result)) {
      if (piiKeys.includes(key) && typeof result[key] === 'string') {
        result[key] = this.tokenize(result[key]);
      } else if (typeof result[key] === 'object') {
        result[key] = this.anonymizeObject(result[key]);
      }
    }
    
    return result;
  }
}
