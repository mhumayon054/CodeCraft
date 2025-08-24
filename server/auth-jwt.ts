import { Express, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { 
  registrationValidationSchema, 
  loginValidationSchema, 
  calculatePasswordStrength 
} from "./password-validation";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from "./jwt";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const scryptAsync = promisify(scrypt);

// Password hashing functions
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// JWT Authentication Middleware
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // Also check for token in cookies
    const cookieToken = req.cookies?.accessToken;
    const finalToken = token || cookieToken;

    if (!finalToken) {
      return res.status(401).json({ 
        error: "Access token is required",
        code: "TOKEN_MISSING" 
      });
    }

    // Check if token is blacklisted
    if (await isTokenBlacklisted(finalToken)) {
      return res.status(401).json({ 
        error: "Token has been revoked",
        code: "TOKEN_REVOKED" 
      });
    }

    // Verify the token
    const payload = verifyAccessToken(finalToken);
    if (!payload) {
      return res.status(401).json({ 
        error: "Invalid or expired token",
        code: "TOKEN_INVALID" 
      });
    }

    // Get user from database
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(401).json({ 
        error: "User not found",
        code: "USER_NOT_FOUND" 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ 
      error: "Authentication failed",
      code: "AUTH_ERROR" 
    });
  }
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.accessToken;
    const finalToken = token || cookieToken;

    if (finalToken) {
      const isBlacklisted = await isTokenBlacklisted(finalToken);
      if (!isBlacklisted) {
        const payload = verifyAccessToken(finalToken);
        if (payload) {
          const user = await storage.getUser(payload.userId);
          if (user) {
            req.user = user;
          }
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

// Set secure HTTP-only cookies
function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Access token cookie (15 minutes)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token cookie (7 days)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// Clear token cookies
function clearTokenCookies(res: Response) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
}

export function setupJWTAuth(app: Express) {
  // Apply general rate limiting to all routes
  app.use('/api', generalLimiter);

  // Registration endpoint
  app.post("/api/register", authLimiter, async (req: Request, res: Response) => {
    try {
      // Validate input
      const validation = registrationValidationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      const { name, email, password } = validation.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          error: "Email already registered",
          code: "EMAIL_EXISTS" 
        });
      }

      // Calculate password strength for feedback
      const strengthAnalysis = calculatePasswordStrength(password);
      if (strengthAnalysis.strength === "very-weak" || strengthAnalysis.strength === "weak") {
        return res.status(400).json({
          error: "Password is too weak",
          feedback: strengthAnalysis.feedback,
          strength: strengthAnalysis.strength,
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword,
        role: "student",
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const { token: refreshToken } = await generateRefreshToken(user.id);

      // Set secure cookies
      setTokenCookies(res, accessToken, refreshToken);

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({
        user: userWithoutPassword,
        message: "Account created successfully",
      });

    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        error: "Internal server error",
        code: "REGISTRATION_ERROR" 
      });
    }
  });

  // Login endpoint
  app.post("/api/login", authLimiter, async (req: Request, res: Response) => {
    try {
      // Validate input
      const validation = loginValidationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      const { email, password } = validation.data;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          error: "Invalid credentials",
          code: "INVALID_CREDENTIALS" 
        });
      }

      // Verify password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: "Invalid credentials",
          code: "INVALID_CREDENTIALS" 
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const { token: refreshToken } = await generateRefreshToken(user.id);

      // Set secure cookies
      setTokenCookies(res, accessToken, refreshToken);

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json({
        user: userWithoutPassword,
        message: "Login successful",
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        error: "Internal server error",
        code: "LOGIN_ERROR" 
      });
    }
  });

  // Refresh token endpoint
  app.post("/api/refresh", async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ 
          error: "Refresh token is required",
          code: "REFRESH_TOKEN_MISSING" 
        });
      }

      // Verify refresh token
      const payload = await verifyRefreshToken(refreshToken);
      if (!payload) {
        clearTokenCookies(res);
        return res.status(401).json({ 
          error: "Invalid or expired refresh token",
          code: "REFRESH_TOKEN_INVALID" 
        });
      }

      // Get user
      const user = await storage.getUser(payload.userId);
      if (!user) {
        clearTokenCookies(res);
        return res.status(401).json({ 
          error: "User not found",
          code: "USER_NOT_FOUND" 
        });
      }

      // Revoke old refresh token and generate new ones
      await revokeRefreshToken(payload.tokenId, payload.userId);
      
      const newAccessToken = generateAccessToken(user);
      const { token: newRefreshToken } = await generateRefreshToken(user.id);

      // Set new secure cookies
      setTokenCookies(res, newAccessToken, newRefreshToken);

      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json({
        user: userWithoutPassword,
        message: "Tokens refreshed successfully",
      });

    } catch (error) {
      console.error("Refresh error:", error);
      clearTokenCookies(res);
      res.status(500).json({ 
        error: "Internal server error",
        code: "REFRESH_ERROR" 
      });
    }
  });

  // Logout endpoint
  app.post("/api/logout", authenticateToken, async (req: Request, res: Response) => {
    try {
      const accessToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
      const refreshToken = req.cookies?.refreshToken;
      
      // Blacklist access token if present
      if (accessToken) {
        await blacklistToken(accessToken);
      }

      // Revoke refresh token if present
      if (refreshToken) {
        const payload = await verifyRefreshToken(refreshToken);
        if (payload) {
          await revokeRefreshToken(payload.tokenId, payload.userId);
        }
      }

      // Clear cookies
      clearTokenCookies(res);

      res.status(200).json({ 
        message: "Logout successful" 
      });

    } catch (error) {
      console.error("Logout error:", error);
      clearTokenCookies(res);
      res.status(500).json({ 
        error: "Internal server error",
        code: "LOGOUT_ERROR" 
      });
    }
  });

  // Logout all devices endpoint
  app.post("/api/logout-all", authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Revoke all refresh tokens for user
      await revokeAllRefreshTokens(userId);

      // Clear cookies
      clearTokenCookies(res);

      res.status(200).json({ 
        message: "Logged out from all devices successfully" 
      });

    } catch (error) {
      console.error("Logout all error:", error);
      res.status(500).json({ 
        error: "Internal server error",
        code: "LOGOUT_ALL_ERROR" 
      });
    }
  });

  // Get current user endpoint
  app.get("/api/user", authenticateToken, (req: Request, res: Response) => {
    const { password: _, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });

  // Password strength check endpoint
  app.post("/api/check-password-strength", (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ 
          error: "Password is required" 
        });
      }

      const analysis = calculatePasswordStrength(password);
      res.json(analysis);
    } catch (error) {
      console.error("Password strength check error:", error);
      res.status(500).json({ 
        error: "Internal server error" 
      });
    }
  });
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  return authenticateToken(req, res, next);
}