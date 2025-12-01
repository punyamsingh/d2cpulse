/**
 * Shopify Analyzer MCP Server
 *
 * Provides comprehensive competitive intelligence and strategic insights
 * for D2C merchants analyzing Shopify stores
 */

import { z } from "zod";
import { createMCPServer } from "../../utils/createMCPServer.js";
import {
  normalizeShopifyUrl,
  fetchProducts,
  fetchCollections,
  analyzeShopifyStore,
} from "./utils.js";

const serverName = "shopify-analyzer";
const serverTitle = "Shopify Analyzer";
const version = "1.0.0";

export const shopifyAnalyzerServer = createMCPServer({
  id: serverName,
  title: serverTitle,
  description:
    "Comprehensive Shopify store analysis and competitive intelligence for D2C merchants",
  version: version,
});

// Input schema for the analyze store tool
const analyzeStoreInputSchema = z.object({
  store_url: z
    .string()
    .describe(
      'The e-commerce store URL/domain to analyze. Accepts any format: "example.com", "https://example.com", "store.myshopify.com", "example.in", etc. Works with any Shopify-powered store including Indian D2C brands like tatvamkurta.com, bewakoof.com, boat-lifestyle.com, etc.'
    ),
  focus_areas: z
    .array(
      z.enum(["pricing", "products", "merchandising", "positioning", "all"])
    )
    .optional()
    .default(["all"])
    .describe(
      'Which areas to focus analysis on. Use "all" for comprehensive analysis.'
    ),
});

// Register analyze_shopify_store tool
shopifyAnalyzerServer.registerTool({
  name: "analyze_shopify_store",
  description: `Analyzes Shopify store catalogs to extract comprehensive product, pricing, and merchandising insights from public data.

🎯 USE THIS TOOL WHEN:
- User asks to analyze an e-commerce store or website
- User provides a store URL (e.g., store.com, brand.myshopify.com)
- User wants to understand product assortment, pricing patterns, or catalog structure
- User needs data on competitor catalogs or market research

⏱️ EXECUTION TIME: 1-15 minutes depending on catalog size
- Small stores (<250 products): 1-2 minutes
- Medium stores (250-1000 products): 2-5 minutes  
- Large stores (1000+ products): 5-15 minutes

ANALYSIS CAPABILITIES:

📊 CATALOG STRUCTURE
• Complete product inventory with categories and collections
• Price ranges and distribution (min/max/median/quartiles)
• Product type breakdown and primary categories
• Variant complexity and customization options

💰 PRICING INSIGHTS
• Discount patterns (frequency, depth, seasonal trends)
• Psychological pricing tactics (charm pricing, prestige pricing)
• Price distribution and variance across catalog
• Promotional strategy indicators

📦 PRODUCT STRATEGY
• Product freshness and launch cadence
• Catalog age distribution (new/recent/established products)
• Breadth vs depth analysis (categories vs variants)
• SKU complexity and variety

🎨 MERCHANDISING QUALITY
• Visual merchandising (images per product)
• Content quality (description length/detail)
• SEO optimization (title structure, tags, metadata)
• Collection organization and navigation structure
• Single-brand vs multi-vendor approach

⏰ TEMPORAL ANALYSIS
• Product launch frequency and patterns
• Catalog turnover rates
• Seasonal release patterns

IDEAL FOR:
✓ Catalog audits and competitive research
✓ Product assortment planning
✓ Pricing strategy analysis
✓ Merchandising quality assessment
✓ Market research and trend analysis

Note: Analysis is based on public catalog data. Provides factual observations about catalog structure and patterns.`,
  inputSchema: analyzeStoreInputSchema,
  isImplemented: true,
  execute: async (params, context) => {
    const toolName = "analyze_shopify_store";

    try {
      console.log(`[${toolName}] Tool called with params:`, params);

      const validatedInput = analyzeStoreInputSchema.parse(params);
      const { store_url, focus_areas } = validatedInput;

      console.log(`[${toolName}] Starting analysis of ${store_url}`);

      // Default configuration
      const config = {
        maxProducts: 5000,
        maxCollections: 50,
      };

      // Stream progress updates
      const progressUpdates = [];

      progressUpdates.push(`🔍 Starting analysis of ${store_url}...`);
      progressUpdates.push(
        `📊 Fetching full product catalog (system limit: ${config.maxProducts})...`
      );

      // Analyze the store
      const analysis = await analyzeShopifyStore(store_url, config.maxProducts);

      if (!analysis.success) {
        console.error(`[${toolName}] Analysis failed:`, analysis.error);
        return {
          success: false,
          error: `Failed to analyze store: ${analysis.error}`,
        };
      }

      progressUpdates.push(
        `✅ Fetched ${analysis.overview?.total_products || 0} products`
      );
      progressUpdates.push(`✨ Analysis complete!`);

      // Format response based on focus areas
      const includeAll = focus_areas.includes("all");

      const resultData = {
        store: store_url,
        analyzed_at: new Date().toISOString(),
        progress: progressUpdates,
        overview: analysis.overview,
      };

      if (includeAll || focus_areas.includes("pricing")) {
        resultData.pricing_strategy = analysis.pricing_strategy;
      }

      if (includeAll || focus_areas.includes("products")) {
        resultData.product_strategy = analysis.product_strategy;
      }

      console.log(`[${toolName}] Analysis completed successfully`);

      return { success: true, data: resultData };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`[${toolName}] Error:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  },
});

console.log(`[${serverName}] Server initialized with 1 tool`);
