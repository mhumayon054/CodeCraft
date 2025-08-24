import { 
  users, 
  gpaRecords, 
  tasks, 
  classes, 
  chatSessions,
  refreshTokens,
  blacklistedTokens,
  type User, 
  type InsertUser, 
  type GPARecord, 
  type InsertGPARecord,
  type Task,
  type InsertTask,
  type Class,
  type InsertClass,
  type ChatSession,
  type InsertChatSession,
  type RefreshToken,
  type InsertRefreshToken,
  type BlacklistedToken,
  type InsertBlacklistedToken,
  type Subject
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // GPA operations
  createGPARecord(record: InsertGPARecord & { userId: string }): Promise<GPARecord>;
  getGPAHistory(userId: string): Promise<GPARecord[]>;
  getCurrentCGPA(userId: string): Promise<number>;
  
  // Task operations
  createTask(task: InsertTask & { userId: string }): Promise<Task>;
  getTasks(userId: string, filter?: 'all' | 'pending' | 'completed'): Promise<Task[]>;
  updateTask(id: string, userId: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string, userId: string): Promise<boolean>;
  
  // Class operations
  createClass(classData: InsertClass & { teacherId: string }): Promise<Class>;
  getClasses(userId: string): Promise<Class[]>;
  joinClass(classId: string, userId: string): Promise<boolean>;
  
  // Chat operations
  createChatSession(session: InsertChatSession & { userId: string }): Promise<ChatSession>;
  getChatSessions(userId: string): Promise<ChatSession[]>;
  getChatSession(id: string, userId: string): Promise<ChatSession | undefined>;
  updateChatSession(id: string, userId: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;
  
  // Token operations
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(tokenId: string, userId: string): Promise<RefreshToken | undefined>;
  revokeRefreshToken(tokenId: string, userId: string): Promise<void>;
  revokeAllRefreshTokens(userId: string): Promise<void>;
  blacklistToken(token: InsertBlacklistedToken): Promise<BlacklistedToken>;
  isTokenBlacklisted(token: string): Promise<boolean>;
  cleanupExpiredTokens(): Promise<void>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    // Calculate profile completion
    if (updates.name || updates.email || updates.university || updates.program || updates.year || updates.interests) {
      const user = await this.getUser(id);
      if (user) {
        const fields = [
          user.name || updates.name,
          user.email || updates.email,
          user.university || updates.university,
          user.program || updates.program,
          user.year || updates.year,
          (user.interests?.length || updates.interests?.length) ? 1 : 0,
        ];
        const filledFields = fields.filter(Boolean).length;
        updates.profileCompletion = Math.round((filledFields / 6) * 100);
      }
    }

    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createGPARecord(record: InsertGPARecord & { userId: string }): Promise<GPARecord> {
    // Calculate GPA for each subject
    const subjectsWithGPA = record.subjects.map((subject: any) => ({
      ...subject,
      gpa: this.calculateSubjectGPA(subject.marks)
    }));

    // Calculate semester GPA
    const totalPoints = subjectsWithGPA.reduce((sum, subject) => 
      sum + (subject.gpa * subject.creditHours), 0);
    const totalCredits = subjectsWithGPA.reduce((sum, subject) => 
      sum + subject.creditHours, 0);
    const semesterGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;

    // Get existing records to calculate CGPA
    const existingRecords = await this.getGPAHistory(record.userId);
    const allRecords = [...existingRecords];
    
    // Calculate cumulative GPA
    const cumulativeTotalPoints = allRecords.reduce((sum, rec) => 
      sum + (parseFloat(rec.semesterGPA) * rec.subjects.reduce((s: number, sub: any) => s + sub.creditHours, 0)), 0) + totalPoints;
    const cumulativeTotalCredits = allRecords.reduce((sum, rec) => 
      sum + rec.subjects.reduce((s: number, sub: any) => s + sub.creditHours, 0), 0) + totalCredits;
    const cgpa = cumulativeTotalCredits > 0 ? cumulativeTotalPoints / cumulativeTotalCredits : 0;

    const [gpaRecord] = await db
      .insert(gpaRecords)
      .values({
        ...record,
        subjects: subjectsWithGPA,
        semesterGPA: semesterGPA.toFixed(2),
        cgpaAfterThisSemester: cgpa.toFixed(2),
      })
      .returning();
    
    return gpaRecord;
  }

  private calculateSubjectGPA(marks: number): number {
    if (marks >= 80) return 4.0;
    if (marks >= 70) return 3.0;
    if (marks >= 60) return 2.0;
    if (marks >= 50) return 1.0;
    return 0.0;
  }

  async getGPAHistory(userId: string): Promise<GPARecord[]> {
    return await db
      .select()
      .from(gpaRecords)
      .where(eq(gpaRecords.userId, userId))
      .orderBy(desc(gpaRecords.semesterNo));
  }

  async getCurrentCGPA(userId: string): Promise<number> {
    const records = await this.getGPAHistory(userId);
    if (records.length === 0) return 0;
    return parseFloat(records[0].cgpaAfterThisSemester);
  }

  async createTask(task: InsertTask & { userId: string }): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return newTask;
  }

  async getTasks(userId: string, filter = 'all'): Promise<Task[]> {
    let baseQuery = db.select().from(tasks);
    
    if (filter === 'pending') {
      return await baseQuery.where(and(eq(tasks.userId, userId), eq(tasks.completed, false))).orderBy(desc(tasks.dueAt));
    } else if (filter === 'completed') {
      return await baseQuery.where(and(eq(tasks.userId, userId), eq(tasks.completed, true))).orderBy(desc(tasks.dueAt));
    }
    
    return await baseQuery.where(eq(tasks.userId, userId)).orderBy(desc(tasks.dueAt));
  }

  async updateTask(id: string, userId: string, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async createClass(classData: InsertClass & { teacherId: string }): Promise<Class> {
    const [newClass] = await db
      .insert(classes)
      .values(classData)
      .returning();
    return newClass;
  }

  async getClasses(userId: string): Promise<Class[]> {
    // Get classes where user is teacher or participant
    const allClasses = await db
      .select()
      .from(classes)
      .orderBy(desc(classes.startsAt));
    
    return allClasses.filter(cls => 
      cls.teacherId === userId || (cls.participants || []).includes(userId)
    );
  }

  async joinClass(classId: string, userId: string): Promise<boolean> {
    const [classData] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));
    
    if (!classData || (classData.participants || []).includes(userId)) {
      return false;
    }

    const updatedParticipants = [...(classData.participants || []), userId];
    await db
      .update(classes)
      .set({ participants: updatedParticipants })
      .where(eq(classes.id, classId));
    
    return true;
  }

  async createChatSession(sessionData: InsertChatSession & { userId: string }): Promise<ChatSession> {
    const [session] = await db
      .insert(chatSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async getChatSession(id: string, userId: string): Promise<ChatSession | undefined> {
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)));
    return session || undefined;
  }

  async updateChatSession(id: string, userId: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const [session] = await db
      .update(chatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
      .returning();
    return session || undefined;
  }

  // Token operations
  async createRefreshToken(tokenData: InsertRefreshToken): Promise<RefreshToken> {
    const [token] = await db
      .insert(refreshTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getRefreshToken(tokenId: string, userId: string): Promise<RefreshToken | undefined> {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, tokenId), eq(refreshTokens.userId, userId)));
    return token || undefined;
  }

  async revokeRefreshToken(tokenId: string, userId: string): Promise<void> {
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.token, tokenId), eq(refreshTokens.userId, userId)));
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
  }

  async blacklistToken(tokenData: InsertBlacklistedToken): Promise<BlacklistedToken> {
    const [token] = await db
      .insert(blacklistedTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const [blacklisted] = await db
      .select()
      .from(blacklistedTokens)
      .where(eq(blacklistedTokens.token, token));
    return !!blacklisted;
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    
    // Clean up expired refresh tokens
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, now));
    
    // Clean up expired blacklisted tokens
    await db
      .delete(blacklistedTokens)
      .where(lt(blacklistedTokens.expiresAt, now));
  }
}

export const storage = new DatabaseStorage();
