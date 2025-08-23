import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth } from "./auth";
import { storage } from "./storage";
import { getChatResponse, getCareerRecommendations, getGPAProjection } from "./openai";
import { insertGPARecordSchema, insertTaskSchema, insertClassSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { message: "Too many authentication attempts, please try again later." }
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { message: "Too many AI requests, please try again later." }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Apply rate limiting to auth routes
  app.use("/api/register", authLimiter);
  app.use("/api/login", authLimiter);
  app.use("/api/ai/*", aiLimiter);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Profile routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { password: _, ...profile } = user;
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updates.id;
      delete updates.password;
      delete updates.createdAt;
      delete updates.updatedAt;
      
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...profile } = updatedUser;
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // GPA routes
  app.post("/api/gpa/semester", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = insertGPARecordSchema.parse(req.body);
      
      // Validate marks are within 0-100 range
      for (const subject of data.subjects) {
        if (subject.marks < 0 || subject.marks > 100) {
          return res.status(400).json({ message: "Marks must be between 0 and 100" });
        }
      }
      
      const record = await storage.createGPARecord({ ...data, userId });
      const currentCGPA = await storage.getCurrentCGPA(userId);
      
      res.status(201).json({ record, currentCGPA });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create GPA record" });
    }
  });

  app.get("/api/gpa/history", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const history = await storage.getGPAHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch GPA history" });
    }
  });

  app.post("/api/gpa/projection", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { nextSemesterTargetGPA, plannedCreditHours } = req.body;
      
      if (!nextSemesterTargetGPA || !plannedCreditHours) {
        return res.status(400).json({ message: "Target GPA and planned credit hours are required" });
      }
      
      const currentCGPA = await storage.getCurrentCGPA(userId);
      const gpaHistory = await storage.getGPAHistory(userId);
      const completedCreditHours = gpaHistory.reduce((sum, record) => 
        sum + record.subjects.reduce((s: number, sub: any) => s + sub.creditHours, 0), 0);
      
      const projection = await getGPAProjection(
        currentCGPA, 
        nextSemesterTargetGPA, 
        plannedCreditHours, 
        completedCreditHours
      );
      
      res.json(projection);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate GPA projection" });
    }
  });

  // Future Predictor routes
  app.post("/api/predictor/recommend", requireAuth, async (req, res) => {
    try {
      const { interests, currentSkills } = req.body;
      
      if (!interests || !Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({ message: "Interests array is required" });
      }
      
      const recommendations = await getCareerRecommendations(interests, currentSkills);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get career recommendations" });
    }
  });

  // Online Classes routes
  app.post("/api/classes", requireAuth, async (req, res) => {
    try {
      const teacherId = req.user!.id;
      
      if (req.user!.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can create classes" });
      }
      
      const data = insertClassSchema.parse(req.body);
      const classData = await storage.createClass({ ...data, teacherId });
      
      res.status(201).json(classData);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  app.get("/api/classes", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const classes = await storage.getClasses(userId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post("/api/classes/:id/join", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const classId = req.params.id;
      
      const success = await storage.joinClass(classId, userId);
      if (!success) {
        return res.status(400).json({ message: "Unable to join class" });
      }
      
      res.json({ message: "Successfully joined class" });
    } catch (error) {
      res.status(500).json({ message: "Failed to join class" });
    }
  });

  // Study Planner routes
  app.post("/api/planner/tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = insertTaskSchema.parse(req.body);
      
      const task = await storage.createTask({ ...data, userId });
      res.status(201).json(task);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get("/api/planner/tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const filter = req.query.filter as 'all' | 'pending' | 'completed' | undefined;
      
      const tasks = await storage.getTasks(userId, filter);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.put("/api/planner/tasks/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;
      const updates = req.body;
      
      const task = await storage.updateTask(taskId, userId, updates);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/planner/tasks/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;
      
      const success = await storage.deleteTask(taskId, userId);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // AI Study Assistant routes
  app.post("/api/ai/chat", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { sessionId, message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      let session;
      if (sessionId) {
        session = await storage.getChatSession(sessionId, userId);
        if (!session) {
          return res.status(404).json({ message: "Chat session not found" });
        }
      } else {
        // Create new session
        session = await storage.createChatSession({
          userId,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          messages: []
        });
      }
      
      // Get conversation history
      const conversationHistory = session.messages.slice(-10); // Last 10 messages for context
      
      // Get AI response
      const aiResponse = await getChatResponse(message, conversationHistory);
      
      // Update session with new messages
      const updatedMessages = [
        ...session.messages,
        { role: "user" as const, content: message, timestamp: new Date().toISOString() },
        { role: "assistant" as const, content: aiResponse, timestamp: new Date().toISOString() }
      ];
      
      const updatedSession = await storage.updateChatSession(session.id, userId, {
        messages: updatedMessages
      });
      
      res.json({
        sessionId: session.id,
        reply: aiResponse,
        messages: updatedMessages
      });
    } catch (error) {
      res.status(500).json({ message: "AI chat service temporarily unavailable" });
    }
  });

  app.get("/api/ai/chats", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/ai/chats/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.id;
      
      const session = await storage.getChatSession(sessionId, userId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
