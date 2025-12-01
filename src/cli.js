#!/usr/bin/env node

/**
 * D2CPulse MCP Server CLI
 *
 * Run this as a standalone MCP server for AI assistants to use.
 *
 * Usage:
 *   npx d2cpulse          # Run with stdio transport
 *   npx d2cpulse --stdio  # Explicit stdio mode
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { analyzeShopifyStore } from "./lib/mcp/servers/shopify-analyzer/utils.js";

const SERVER_NAME = "d2cpulse";
const SERVER_VERSION = "1.0.0";

/**
 * Create and configure the MCP server
 */
function createServer() {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register the analyze_shopify_store tool
  server.tool(
    "analyze_shopify_store",
    `Analyzes Shopify store catalogs to extract comprehensive product, pricing, and merchandising insights.

🎯 USE THIS TOOL WHEN:
- User asks to analyze an e-commerce store or website
- User provides a store URL (e.g., store.com, brand.myshopify.com)
- User wants competitive intelligence on a D2C brand
- User needs data on competitor catalogs or market research

📊 ANALYSIS INCLUDES:
- Complete product inventory with categories and collections
- Price ranges and distribution (min/max/median)
- Pricing strategy classification (luxury/premium/value/penetration)
- Discount patterns and promotional strategy
- Product variant complexity
- Catalog breadth vs depth analysis

⏱️ EXECUTION TIME: 1-15 minutes depending on catalog size`,
    {
      store_url: z
        .string()
        .describe('The store URL/domain to analyze (e.g., "example.com")'),
      focus_areas: z
        .array(
          z.enum(["pricing", "products", "merchandising", "positioning", "all"])
        )
        .optional()
        .default(["all"])
        .describe("Areas to focus the analysis on"),
      max_products: z
        .number()
        .optional()
        .default(5000)
        .describe("Maximum products to analyze"),
    },
    async ({ store_url, focus_areas = ["all"], max_products = 5000 }) => {
      try {
        console.error(`[MCP] Analyzing store: ${store_url}`);

        const analysis = await analyzeShopifyStore(store_url, max_products);

        if (!analysis.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: analysis.error }, null, 2),
              },
            ],
            isError: true,
          };
        }

        // Filter based on focus areas
        const includeAll = focus_areas.includes("all");
        const result = {
          store: store_url,
          analyzed_at: new Date().toISOString(),
          overview: analysis.overview,
        };

        if (includeAll || focus_areas.includes("pricing")) {
          result.pricing_strategy = analysis.pricing_strategy;
        }
        if (includeAll || focus_areas.includes("products")) {
          result.product_strategy = analysis.product_strategy;
        }

        console.error(`[MCP] Analysis complete for ${store_url}`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`[MCP] Error analyzing store:`, errorMessage);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

/**
 * Main entry point
 */
async function main() {
  console.error(`[MCP] Starting ${SERVER_NAME} v${SERVER_VERSION}`);

  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error(`[MCP] Server connected and ready`);
}

main().catch((error) => {
  console.error("[MCP] Fatal error:", error);
  process.exit(1);
});
