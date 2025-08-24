import { z } from "zod";

// Password validation rules as outlined in the security requirements
export const passwordValidationSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
  .refine((password) => {
    // Check for common patterns to avoid
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /user/i,
      /login/i,
    ];
    
    return !commonPatterns.some(pattern => pattern.test(password));
  }, "Password contains common patterns and is not secure")
  .refine((password) => {
    // Check for sequential characters
    const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password);
    return !hasSequential;
  }, "Password should not contain sequential characters")
  .refine((password) => {
    // Check for repeated characters (more than 2 consecutive)
    const hasRepeated = /(.)\1{2,}/.test(password);
    return !hasRepeated;
  }, "Password should not contain more than 2 consecutive identical characters");

// Email validation schema
export const emailValidationSchema = z
  .string()
  .email("Please enter a valid email address")
  .min(5, "Email must be at least 5 characters long")
  .max(254, "Email must not exceed 254 characters")
  .refine((email) => {
    // Additional email validation rules
    const emailParts = email.split("@");
    if (emailParts.length !== 2) return false;
    
    const [localPart, domain] = emailParts;
    
    // Local part validation
    if (localPart.length > 64) return false;
    if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
    if (localPart.includes("..")) return false;
    
    // Domain validation
    if (domain.length > 253) return false;
    if (domain.startsWith("-") || domain.endsWith("-")) return false;
    
    return true;
  }, "Email format is not valid");

// Name validation schema
export const nameValidationSchema = z
  .string()
  .min(2, "Name must be at least 2 characters long")
  .max(50, "Name must not exceed 50 characters")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
  .refine((name) => {
    // Check that name doesn't start or end with special characters
    return !name.match(/^[-'\s]|[-'\s]$/);
  }, "Name cannot start or end with special characters")
  .refine((name) => {
    // Check for reasonable number of spaces (no more than 3 consecutive)
    return !name.match(/\s{4,}/);
  }, "Name contains too many consecutive spaces");

// Complete registration validation schema
export const registrationValidationSchema = z.object({
  name: nameValidationSchema,
  email: emailValidationSchema,
  password: passwordValidationSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Login validation schema
export const loginValidationSchema = z.object({
  email: emailValidationSchema,
  password: z.string().min(1, "Password is required"),
});

// Password strength scoring
export function calculatePasswordStrength(password: string): {
  score: number;
  strength: "very-weak" | "weak" | "fair" | "good" | "strong";
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  else if (password.length < 8) feedback.push("Use at least 8 characters");

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push("Add special characters");

  // Pattern checks
  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push("Avoid repeated characters");

  if (!/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) score += 1;
  else feedback.push("Avoid sequential characters");

  // Determine strength level
  let strength: "very-weak" | "weak" | "fair" | "good" | "strong";
  if (score <= 2) strength = "very-weak";
  else if (score <= 4) strength = "weak";
  else if (score <= 6) strength = "fair";
  else if (score <= 8) strength = "good";
  else strength = "strong";

  return { score, strength, feedback };
}