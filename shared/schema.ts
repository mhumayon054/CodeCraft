import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["student", "teacher"] }).notNull().default("student"),
  university: text("university"),
  program: text("program"),
  year: integer("year"),
  avatarUrl: text("avatar_url"),
  interests: text("interests").array().default(sql`'{}'::text[]`),
  profileCompletion: integer("profile_completion").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GPA Records table
export const gpaRecords = pgTable("gpa_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  semesterNo: integer("semester_no").notNull(),
  subjects: json("subjects").$type<Array<{
    name: string;
    marks: number;
    creditHours: number;
    gpa: number;
  }>>().notNull(),
  semesterGPA: decimal("semester_gpa", { precision: 3, scale: 2 }).notNull(),
  cgpaAfterThisSemester: decimal("cgpa_after_this_semester", { precision: 3, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks table (Study Planner)
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type", { enum: ["assignment", "exam", "reminder"] }).notNull(),
  dueAt: timestamp("due_at").notNull(),
  completed: boolean("completed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Classes table (Online Classes Hub)
export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  meetingLink: text("meeting_link").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  durationMins: integer("duration_mins").notNull(),
  participants: text("participants").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat Sessions table (AI)
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  messages: json("messages").$type<Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Refresh Tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blacklisted Tokens table
export const blacklistedTokens = pgTable("blacklisted_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  gpaRecords: many(gpaRecords),
  tasks: many(tasks),
  classes: many(classes),
  chatSessions: many(chatSessions),
  refreshTokens: many(refreshTokens),
}));

export const gpaRecordRelations = relations(gpaRecords, ({ one }) => ({
  user: one(users, {
    fields: [gpaRecords.userId],
    references: [users.id],
  }),
}));

export const taskRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const classRelations = relations(classes, ({ one }) => ({
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
  }),
}));

export const chatSessionRelations = relations(chatSessions, ({ one }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
}));

export const refreshTokenRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGPARecordSchema = createInsertSchema(gpaRecords).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  teacherId: true,
  createdAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
});

export const insertBlacklistedTokenSchema = createInsertSchema(blacklistedTokens).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GPARecord = typeof gpaRecords.$inferSelect;
export type InsertGPARecord = z.infer<typeof insertGPARecordSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type BlacklistedToken = typeof blacklistedTokens.$inferSelect;
export type InsertBlacklistedToken = z.infer<typeof insertBlacklistedTokenSchema>;

// Subject type for GPA calculation
export type Subject = {
  name: string;
  marks: number;
  creditHours: number;
  gpa: number;
};
