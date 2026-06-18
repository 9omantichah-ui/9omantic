import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return null; // 未配置密钥时降级为不加密
  return scryptSync(secret, "actionflow-salt", 32);
}

/**
 * 加密明文字符串，返回 "iv:authTag:ciphertext" 格式的 Base64 字符串
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext; // 未配置密钥时直接返回明文
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * 解密 "iv:authTag:ciphertext" 格式的字符串，返回明文
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  if (!key) return ciphertext; // 未配置密钥时假定是明文
  const [ivB64, authTagB64, dataB64] = ciphertext.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) throw new Error("无效的加密格式");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(data) + decipher.final("utf8");
}

/**
 * 判断一个字符串是否是加密格式（iv:authTag:ciphertext）
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts.every(p => {
    try { return Buffer.from(p, "base64").length > 0; } catch { return false; }
  });
}