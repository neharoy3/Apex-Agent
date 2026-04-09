/**
 * AgentX — Secure Gemini Proxy
 *
 * This API route keeps the Gemini API key hidden on the server.
 * The frontend calls POST /api/chat instead of calling Google directly.
 * Model is configured in agent.config.js
 */

import config from "../../../agent.config";

function extractSources(data) {
  const grounding = data?.candidates?.[0]?.groundingMetadata;
  const chunks = grounding?.groundingChunks || [];

  const urls = chunks
    .map((chunk) => chunk?.web?.uri)
    .filter((uri) => typeof uri === "string" && uri.length > 0);

  return Array.from(new Set(urls));
}

export async function POST(request) {
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return Response.json(
      { error: "API key not configured on server" },
      { status: 500 },
    );
  }

  try {
    const { messages, systemPrompt } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "Invalid request: messages array required" },
        { status: 400 },
      );
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const requireSearchVerification =
      config.requireSearchVerification !== false;
    const searchVerificationFallback =
      config.searchVerificationFallback || "refuse";

    const verificationInstruction =
      "Before finalizing any factual claim, run Google Search and ground the answer in current web results. If grounding is unavailable, state that verification failed instead of guessing. Include concise source links at the end.";

    const mergedSystemPrompt = [systemPrompt, verificationInstruction]
      .filter(Boolean)
      .join("\n\n");

    const body = {
      contents,
      system_instruction: { parts: [{ text: mergedSystemPrompt }] },
    };

    // Allow Gemini to fetch current information from Google Search when needed.
    body.tools = [{ google_search: {} }];

    const preferredModel = config.model || "gemini-2.5-flash-lite";
    const fallbackModels = Array.isArray(config.fallbackModels)
      ? config.fallbackModels
      : [];

    // Try configured model first, then fallback models in order.
    const modelCandidates = Array.from(
      new Set([preferredModel, ...fallbackModels].filter(Boolean)),
    );

    let lastError = null;
    for (const model of modelCandidates) {
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // On quota/rate limit for current model, continue to next fallback model.
      if (data.error && data.error.code === 429) {
        lastError = `${model}: ${data.error.message}`;
        continue;
      }

      if (data.error) {
        return Response.json(
          { error: data.error.message, code: data.error.code, model },
          { status: data.error.code || 500 },
        );
      }

      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("\n")
        .trim();

      const sources = extractSources(data);
      const hasVerification = sources.length > 0;

      if (requireSearchVerification && !hasVerification) {
        if (searchVerificationFallback === "best-effort") {
          return Response.json({ text, model, sources: [] });
        }

        lastError = `${model}: Search verification unavailable`;
        continue;
      }

      if (!text) {
        return Response.json(
          { error: "Empty response from Gemini" },
          { status: 502 },
        );
      }

      const textWithSources = hasVerification
        ? `${text}\n\nSources:\n${sources.map((url) => `- ${url}`).join("\n")}`
        : text;

      return Response.json({ text: textWithSources, model, sources });
    }

    // All candidate models exhausted
    return Response.json(
      {
        error: lastError || "Rate limited — please try again later",
        code: 429,
      },
      { status: 429 },
    );
  } catch (err) {
    console.error("API route error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
