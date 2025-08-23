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
    throw new Error("AI service temporarily unavailable. Please try again later.");
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
    throw new Error("Career recommendation service temporarily unavailable.");
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
    throw new Error("GPA projection service temporarily unavailable.");
  }
}
