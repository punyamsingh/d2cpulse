import { NeuroLink } from "@juspay/neurolink";
import { analyzeShopifyStore } from "@/lib/shopify-analyzer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Singleton NeuroLink instance for conversation memory
let neurolinkInstance = null;

function getNeuroLink() {
  if (!neurolinkInstance) {
    neurolinkInstance = new NeuroLink();
  }
  return neurolinkInstance;
}

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // Use singleton NeuroLink instance for conversation memory
    const neurolink = getNeuroLink();

    // Get the user's message
    const userMessage = messages[messages.length - 1].content;

    // Check if user is asking to analyze a store - match domain patterns
    const analyzeMatch = userMessage.match(
      /(?:analyze|check|review|tell me about|what.*about)?\s*(?:https?:\/\/)?([a-z0-9-]+\.[a-z]{2,})/i
    );

    let toolResult = null;
    let enhancedSystemPrompt = `You are D2CPulse, an AI assistant for competitive intelligence on D2C brands.`;

    if (analyzeMatch) {
      const storeUrl = analyzeMatch[1];
      console.log(`\n=== DETECTED STORE ANALYSIS REQUEST ===`);
      console.log(`Store URL: ${storeUrl}`);

      // Call the tool directly before LLM
      console.log(`\n=== CALLING SHOPIFY ANALYZER ===`);
      toolResult = await analyzeShopifyStore(storeUrl);
      console.log(`\n=== TOOL RESULT ===`);
      console.log(`Success: ${toolResult.success}`);

      if (toolResult.success) {
        console.log(`Products: ${toolResult.overview?.total_products || 0}`);
        // Inject the tool result into the system prompt
        enhancedSystemPrompt = `You are D2CPulse, an AI assistant for competitive intelligence on D2C brands.

I have analyzed ${storeUrl} and here is the REAL data from the store:

${JSON.stringify(toolResult, null, 2)}

Your task: Create a detailed competitive intelligence report using ONLY this data. Do NOT make up any additional information. Use the actual prices, products, and insights from the data above.

Format your response as a single JSON object matching this schema:
{
  "title": "string",
  "metrics": [{ "label": "string", "value": "string or number" }],
  "sections": [
    {
      "title": "string",
      "content": "string (optional)",
      "items": ["string", ...] (optional)
    }
  ]
}
Do not include any HTML, markdown, or code blocks. Only output the JSON object.`;
      } else {
        enhancedSystemPrompt = `You are D2CPulse. The store analysis for ${storeUrl} failed with error: ${toolResult.error}

Inform the user of this error and suggest they verify the URL or try a different store.`;
      }
    }

    console.log("LiteLLM Config:", {
      baseURL: process.env.LITELLM_BASE_URL,
      model: process.env.LITELLM_MODEL,
      conversationLength: messages.length,
    });

    // Stream the response with full conversation history for memory
    // NeuroLink maintains conversation memory internally when using the same instance
    const streamResult = await neurolink.stream({
      input: {
        text: userMessage,
      },
      messages: messages, // Pass full conversation history including current message
      provider: "litellm",
      model: process.env.LITELLM_MODEL || "claude-sonnet-4-5",
      systemPrompt: enhancedSystemPrompt,
      maxTokens: 8000,
      temperature: 0.7,
    });

    // Accumulate full response, clean it, validate, then send to frontend
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulatedResponse = "";

          // Accumulate all chunks from NeuroLink
          for await (const chunk of streamResult.stream) {
            if (chunk && typeof chunk === "object") {
              if ("content" in chunk && typeof chunk.content === "string") {
                accumulatedResponse += chunk.content;
              } else if ("type" in chunk && chunk.type === "audio") {
                // Skip audio chunks
                continue;
              }
            }
          }

          // Clean and validate the full response
          if (accumulatedResponse.trim()) {
            // Strip markdown code blocks (```json ... ``` or ``` ... ```)
            let cleanedResponse = accumulatedResponse
              .replace(/^```(json)?\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();

            try {
              const parsed = JSON.parse(cleanedResponse);
              console.log("✓ Valid JSON response generated");

              // Send cleaned, stringified JSON to frontend
              const jsonString = JSON.stringify(parsed);
              controller.enqueue(
                encoder.encode(`0:${JSON.stringify(jsonString)}\n`)
              );
            } catch (e) {
              console.error("✗ AI generated invalid JSON:", e.message);
              console.log(
                "Raw response:",
                accumulatedResponse.substring(0, 500)
              );
              console.log(
                "Cleaned response:",
                cleanedResponse.substring(0, 500)
              );

              // Send error to frontend
              controller.enqueue(
                encoder.encode(
                  `error:${JSON.stringify({
                    error: "AI generated invalid JSON. Please try again.",
                  })}\n`
                )
              );
            }
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `error:${JSON.stringify({ error: error.message })}\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
