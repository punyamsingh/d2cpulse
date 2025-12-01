/**
 * MCP (Model Context Protocol) Module
 *
 * This module can be used in two ways:
 * 1. As an MCP server package - import and use with any MCP-compatible client
 * 2. With NeuroLink - register tools for AI-powered applications
 *
 * Usage as MCP server:
 *   import { shopifyAnalyzerServer } from '@d2cpulse/shopify-analyzer/server';
 *
 * Usage with NeuroLink:
 *   import { registerToolsWithNeuroLink } from '@d2cpulse/shopify-analyzer';
 *   registerToolsWithNeuroLink(neurolinkInstance);
 */

import { mcpConfig, getAllImplementedTools } from "./servers/config.js";

// Re-export the server for direct MCP usage
export { shopifyAnalyzerServer } from "./servers/shopify-analyzer/index.js";
export { analyzeShopifyStore } from "./servers/shopify-analyzer/utils.js";

/**
 * Transform MCP tools to NeuroLink format
 * @param {Object} neurolink - NeuroLink instance
 * @returns {Array} Transformed tools ready for registration
 */
export function getToolsForNeuroLink() {
  const implementedTools = getAllImplementedTools();

  return implementedTools.map(({ name, serverId, tool }) => ({
    name,
    tool: {
      ...tool,
      description: tool.description ?? `${tool.name} tool from ${serverId}`,
      inputSchema: tool.inputSchema ?? {},
      execute: async (params, context) => {
        try {
          console.log(`[MCP] Executing tool: ${name}`, { params });

          // Create execution context
          const executionContext = context || {
            conversationId: `neurolink-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          };

          const result = await tool.execute(params, executionContext);

          console.log(`[MCP] Tool ${name} execution completed`, {
            success: result?.success,
          });

          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(`[MCP] Tool ${name} execution error:`, errorMessage);

          return {
            success: false,
            error: `Tool execution failed: ${errorMessage}`,
          };
        }
      },
    },
  }));
}

/**
 * Register all MCP tools with a NeuroLink instance
 * @param {Object} neurolink - NeuroLink instance
 */
export function registerToolsWithNeuroLink(neurolink) {
  const tools = getToolsForNeuroLink();
  neurolink.registerTools(tools);

  console.log(
    `[MCP] Registered ${tools.length} tools with NeuroLink:`,
    tools.map((t) => t.name)
  );

  return tools;
}

// MCP utilities
export const MCPUtils = {
  /**
   * Get a formatted list of all available tools
   */
  getAvailableTools: () => {
    const tools = getAllImplementedTools();
    return tools.map(({ name, tool }) => ({
      name,
      description: tool.description,
    }));
  },

  /**
   * Test connectivity / initialization status
   */
  testConnectivity: () => {
    try {
      const servers = mcpConfig.getAllServers();
      const tools = getAllImplementedTools();

      return {
        status: "ok",
        message: `Connected to ${servers.length} MCP servers with ${tools.length} total tools`,
        servers: servers.map((s) => ({
          id: s.id,
          title: s.title,
          toolCount: Object.keys(s.getImplementedTools()).length,
        })),
      };
    } catch (error) {
      return {
        status: "error",
        message: `Failed to connect to MCP servers: ${error.message}`,
      };
    }
  },
};

export { mcpConfig };
