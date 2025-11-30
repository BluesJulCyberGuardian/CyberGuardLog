import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set - AI anomaly detection will be disabled");
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function analyzeLogForAnomalies(logMessage: string, logContext: string): Promise<{
  isAnomalous: boolean;
  confidence: number;
  analysis: string;
}> {
  if (!openai) {
    return {
      isAnomalous: false,
      confidence: 0,
      analysis: "AI analysis unavailable",
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a cybersecurity expert analyzing network security logs. 
Determine if the given log entry represents an anomalous or suspicious activity. 
Consider patterns like:
- Unusual IP addresses or geographical locations
- Abnormal access patterns or timing
- Suspicious authentication attempts
- Unusual data transfers
- Port scanning or network reconnaissance
- Privilege escalation attempts
- Data exfiltration indicators

Respond with JSON in this format: { "isAnomalous": boolean, "confidence": number (0-1), "analysis": "brief explanation" }`,
        },
        {
          role: "user",
          content: `Log Message: ${logMessage}\n\nContext: ${logContext}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      isAnomalous: result.isAnomalous || false,
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      analysis: result.analysis || "No analysis available",
    };
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    return {
      isAnomalous: false,
      confidence: 0,
      analysis: "AI analysis failed",
    };
  }
}
