import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "fallback-refresh-secret-change-in-production";

// Token expiration times
const ACCESS_TOKEN_EXPIRES_IN = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = "7d"; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

// Generate access token
export function generateAccessToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

// Generate refresh token
export async function generateRefreshToken(userId: string): Promise<{ token: string; tokenId: string }> {
  const tokenId = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const token = jwt.sign(
    {
      userId,
      tokenId,
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  // Store refresh token in database
  await storage.createRefreshToken({
    userId,
    token: tokenId, // Store only the tokenId, not the full JWT
    expiresAt,
  });

  return { token, tokenId };
}

// Verify access token
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
    
    // Check if token exists in database and is not expired
    const storedToken = await storage.getRefreshToken(payload.tokenId, payload.userId);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

// Blacklist a token
export async function blacklistToken(token: string): Promise<void> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (payload.exp) {
      const expiresAt = new Date(payload.exp * 1000);
      await storage.blacklistToken({
        token,
        expiresAt,
      });
    }
  } catch (error) {
    // Token is invalid or expired, no need to blacklist
  }
}

// Check if token is blacklisted
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  return await storage.isTokenBlacklisted(token);
}

// Revoke refresh token
export async function revokeRefreshToken(tokenId: string, userId: string): Promise<void> {
  await storage.revokeRefreshToken(tokenId, userId);
}

// Revoke all refresh tokens for a user
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await storage.revokeAllRefreshTokens(userId);
}

// Clean up expired tokens (should be run periodically)
export async function cleanupExpiredTokens(): Promise<void> {
  await storage.cleanupExpiredTokens();
}