import { NeuroLink } from "@juspay/neurolink";
import { registerToolsWithNeuroLink } from "@/lib/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Singleton NeuroLink instance with registered tools
let neurolinkInstance = null;
let toolsRegistered = false;

function getNeuroLink() {
  if (!neurolinkInstance) {
    neurolinkInstance = new NeuroLink();

    // Register MCP tools with NeuroLink
    if (!toolsRegistered) {
      registerToolsWithNeuroLink(neurolinkInstance);
      toolsRegistered = true;
    }
  }
  return neurolinkInstance;
}

// System prompt that instructs the AI on how to use tools and format responses
const SYSTEM_PROMPT = `You are D2CPulse, an AI assistant for competitive intelligence on D2C (Direct-to-Consumer) brands.

## Your Capabilities
You have access to the shopify-analyzer__analyze_shopify_store tool that can fetch and analyze real data from any Shopify-powered e-commerce store. Use this tool whenever a user:
- Asks to analyze a store or website
- Provides a store URL or domain name
- Wants competitive intelligence on a brand
- Asks about pricing, products, or strategy of any e-commerce store

## How to Respond
When the user asks you to analyze a store:
1. Call the shopify-analyzer__analyze_shopify_store tool with the store URL
2. Wait for the results
3. Create a comprehensive competitive intelligence report based on the REAL data

## CRITICAL: Response Format
You MUST respond with ONLY a valid JSON object. No text before or after. No explanations. No markdown code blocks.

The JSON must follow this exact structure:
{
  "title": "Store Analysis Report Title",
  "metrics": [
    { "label": "Total Products", "value": 123 },
    { "label": "Price Range", "value": "₹500 - ₹5,000" },
    { "label": "Collections", "value": 15 }
  ],
  "sections": [
    {
      "title": "Section Title",
      "content": "Optional paragraph content",
      "items": ["Bullet point 1", "Bullet point 2"]
    }
  ]
}

RULES:
- Output ONLY the JSON object, nothing else
- No text like "I'll analyze..." or "Here's the report..."
- No markdown formatting or code blocks
- Use actual data from the tool results
- Do NOT make up information`;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // Use singleton NeuroLink instance with registered tools
    const neurolink = getNeuroLink();

    // Get the user's message
    const userMessage = messages[messages.length - 1].content;

    console.log("Processing chat request:", {
      messageCount: messages.length,
      userMessage: userMessage.substring(0, 100),
    });

    // Stream the response - NeuroLink will automatically call tools when needed
    const streamResult = await neurolink.stream({
      input: {
        text: userMessage,
      },
      messages: messages,
      provider: "litellm",
      model: process.env.LITELLM_MODEL || "claude-sonnet-4-5",
      systemPrompt: SYSTEM_PROMPT,
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
            // Try to extract JSON from the response
            let cleanedResponse = accumulatedResponse;

            // First, try to find JSON within markdown code blocks
            const codeBlockMatch = accumulatedResponse.match(
              /```(?:json)?\s*([\s\S]*?)```/
            );
            if (codeBlockMatch) {
              cleanedResponse = codeBlockMatch[1].trim();
            } else {
              // Try to find JSON object directly (starts with { and ends with })
              const jsonMatch = accumulatedResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                cleanedResponse = jsonMatch[0];
              }
            }

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
