import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function getChatResponse(message: string, conversationHistory: Array<{role: "user" | "assistant", content: string}> = []): Promise<string> {
  try {
    const messages: Array<{role: "user" | "assistant" | "system", content: string}> = [
      {
        role: "system",
        content: "You are Study Genius Model, built by Chef_dev for students. You are an AI study assistant that helps students with academic questions, study planning, and educational guidance. Always be helpful, encouraging, and focus on educational content. Never mention ChatGPT or OpenAI. Always identify yourself as Study Genius Model created by Chef_dev."
      },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Hello! I'm Study Genius Model, built by Chef_dev. I'm currently experiencing high demand, but I'm here to help with your studies! Try asking me about study techniques, time management, or specific academic topics. I'll do my best to assist you with your learning journey.";
  }
}

export async function getCareerRecommendations(interests: string[], currentSkills?: string[]): Promise<{
  recommendations: Array<{
    track: string;
    why: string;
    starterRoadmap: string[];
    resources: string[];
  }>;
  nextSkills: string[];
}> {
  try {
    const prompt = `Based on these interests: ${interests.join(", ")}${currentSkills ? ` and current skills: ${currentSkills.join(", ")}` : ""}, provide career track recommendations for a student. Format your response as JSON with the structure: {
      "recommendations": [
        {
          "track": "career track name",
          "why": "explanation of why this matches their interests",
          "starterRoadmap": ["step 1", "step 2", "step 3", "step 4"],
          "resources": ["resource 1", "resource 2", "resource 3"]
        }
      ],
      "nextSkills": ["skill 1", "skill 2", "skill 3"]
    }
    
    Provide 2-3 relevant career tracks based on their interests. Focus on technology and modern career paths.`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Study Genius Model, built by Chef_dev. Provide career guidance based on student interests. Always respond with valid JSON."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Career recommendations error:", error);
    
    // Provide fallback recommendations when OpenAI is unavailable
    return getFallbackCareerRecommendations(interests, currentSkills);
  }
}

export async function getGPAProjection(currentCGPA: number, targetGPA: number, plannedCreditHours: number, completedCreditHours: number): Promise<{
  projectedCGPA: number;
  delta: number;
  advice: string;
}> {
  try {
    // Calculate what GPA is needed
    const currentTotalPoints = currentCGPA * completedCreditHours;
    const neededPoints = targetGPA * plannedCreditHours;
    const totalCreditsAfter = completedCreditHours + plannedCreditHours;
    const projectedCGPA = (currentTotalPoints + neededPoints) / totalCreditsAfter;
    const delta = projectedCGPA - currentCGPA;

    const prompt = `A student has a current CGPA of ${currentCGPA} with ${completedCreditHours} credit hours completed. They want to achieve ${targetGPA} GPA in their next semester with ${plannedCreditHours} credit hours. The projected CGPA would be ${projectedCGPA.toFixed(2)} (change of ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}). Provide study advice and strategies in 2-3 sentences.`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Study Genius Model, built by Chef_dev. Provide concise study advice for GPA improvement."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return {
      projectedCGPA: Math.round(projectedCGPA * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      advice: response.choices[0].message.content || "Focus on your studies and aim for consistent performance across all courses."
    };
  } catch (error) {
    console.error("GPA projection error:", error);
    
    // Calculate values in fallback since they're not in scope
    const currentTotalPoints = currentCGPA * completedCreditHours;
    const neededPoints = targetGPA * plannedCreditHours;
    const totalCreditsAfter = completedCreditHours + plannedCreditHours;
    const projectedCGPA = (currentTotalPoints + neededPoints) / totalCreditsAfter;
    const delta = projectedCGPA - currentCGPA;
    
    // Provide fallback advice
    const advice = delta > 0 
      ? "Great goal! Focus on consistent study habits, attend all classes, and seek help when needed. Break down complex topics into manageable chunks."
      : "This is achievable! Prioritize high-credit courses, create a structured study schedule, and don't hesitate to use office hours for clarification.";
    
    return {
      projectedCGPA: Math.round(projectedCGPA * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      advice
    };
  }
}

function getFallbackCareerRecommendations(interests: string[], currentSkills?: string[]) {
  const careerMap: Record<string, any> = {
    "AI & ML": {
      track: "Machine Learning Engineer",
      why: "Perfect for AI & ML enthusiasts, involves building intelligent systems and algorithms",
      starterRoadmap: ["Learn Python and statistics", "Study machine learning fundamentals", "Practice with datasets on Kaggle", "Build ML projects"],
      resources: ["Coursera ML Course by Andrew Ng", "Kaggle Learn", "Hands-On Machine Learning book"]
    },
    "Web Development": {
      track: "Full-Stack Developer",
      why: "Great for web development passion, allows you to build complete applications",
      starterRoadmap: ["Master HTML, CSS, JavaScript", "Learn a frontend framework (React/Vue)", "Study backend technologies (Node.js)", "Build full-stack projects"],
      resources: ["FreeCodeCamp", "MDN Web Docs", "The Odin Project"]
    },
    "Mobile Apps": {
      track: "Mobile App Developer",
      why: "Perfect for mobile app interests, create apps used by millions",
      starterRoadmap: ["Choose platform (iOS/Android/Cross-platform)", "Learn Swift/Kotlin or React Native", "Study mobile UI/UX principles", "Publish apps to stores"],
      resources: ["Apple Developer Documentation", "Android Developer Guides", "React Native Docs"]
    },
    "Data Science": {
      track: "Data Scientist",
      why: "Ideal for data enthusiasts, extract insights from complex datasets",
      starterRoadmap: ["Learn Python and R", "Master statistics and probability", "Study data visualization", "Work on real data projects"],
      resources: ["Pandas Documentation", "Matplotlib Tutorials", "Kaggle Datasets"]
    },
    "Cybersecurity": {
      track: "Security Analyst",
      why: "Perfect for cybersecurity interests, protect systems and data",
      starterRoadmap: ["Learn networking fundamentals", "Study security frameworks", "Practice ethical hacking", "Get security certifications"],
      resources: ["CompTIA Security+", "OWASP Top 10", "Cybrary"]
    },
    "Cloud Computing": {
      track: "Cloud Engineer",
      why: "Excellent for cloud interests, build scalable distributed systems",
      starterRoadmap: ["Learn AWS/Azure/GCP basics", "Study cloud architecture patterns", "Practice with cloud services", "Get cloud certifications"],
      resources: ["AWS Training", "Azure Learn", "Google Cloud Skills"]
    },
    "Game Development": {
      track: "Game Developer",
      why: "Perfect for gaming passion, create interactive entertainment experiences",
      starterRoadmap: ["Learn C# or C++", "Master Unity or Unreal Engine", "Study game design principles", "Build and publish games"],
      resources: ["Unity Learn", "Unreal Engine Documentation", "Game Dev Tuts"]
    }
  };

  const recommendations = interests.slice(0, 3).map(interest => 
    careerMap[interest] || {
      track: `${interest} Specialist`,
      why: `Matches your interest in ${interest} with growing market demand`,
      starterRoadmap: ["Research the field thoroughly", "Learn foundational skills", "Build relevant projects", "Network with professionals"],
      resources: ["Industry blogs and publications", "Professional communities", "Online courses and tutorials"]
    }
  );

  return {
    recommendations,
    nextSkills: ["Critical thinking", "Problem solving", "Communication", "Project management"]
  };
}
