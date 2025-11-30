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

Your task: Create a beautiful, detailed HTML report using ONLY this data. Do NOT make up any additional information. Use the actual prices, products, and insights from the data above.

Format your response as clean HTML with proper styling.`;
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

    // Stream the response like lighthouse does
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulatedResponse = "";

          // Process streaming chunks from NeuroLink
          for await (const chunk of streamResult.stream) {
            let chunkText = "";

            if (chunk && typeof chunk === "object") {
              if ("content" in chunk && typeof chunk.content === "string") {
                chunkText = chunk.content;
                accumulatedResponse += chunkText;

                // Send chunk to frontend
                controller.enqueue(
                  encoder.encode(`0:${JSON.stringify(chunkText)}\n`)
                );
              } else if ("type" in chunk && chunk.type === "audio") {
                // Skip audio chunks
                continue;
              }
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
