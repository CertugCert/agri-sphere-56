import CryptoJS from 'crypto-js';

const key = process.env.MASTER_KMS_KEY || 'troque-esta-chave-super-secreta';

export function encryptPassword(password) {
  const encrypted = CryptoJS.AES.encrypt(password, key).toString();
  return encrypted;
}

export function decryptPassword(encryptedPassword) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      // Fallback for non-encrypted passwords during migration
      return encryptedPassword;
    }
    
    return decrypted;
  } catch (error) {
    console.warn('Failed to decrypt password, using as-is:', error.message);
    return encryptedPassword;
  }
}