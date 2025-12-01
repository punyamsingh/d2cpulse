/**
 * MCP Servers Configuration
 * Registers and exports all available MCP servers
 */

import { shopifyAnalyzerServer } from "./shopify-analyzer/index.js";

// All registered MCP servers
const servers = [shopifyAnalyzerServer];

/**
 * Get all registered servers
 * @returns {Array} All MCP servers
 */
export function getAllServers() {
  return servers;
}

/**
 * Get all implemented tools from all servers
 * @returns {Array} Array of tools with server context
 */
export function getAllImplementedTools() {
  const tools = [];

  for (const server of servers) {
    const serverTools = server.getImplementedTools();
    for (const [name, tool] of Object.entries(serverTools)) {
      tools.push({
        name: `${server.id}__${name}`,
        serverId: server.id,
        tool,
      });
    }
  }

  return tools;
}

/**
 * Get a specific server by ID
 * @param {string} serverId - Server identifier
 * @returns {Object|null} Server instance or null
 */
export function getServerById(serverId) {
  return servers.find((s) => s.id === serverId) || null;
}

export const mcpConfig = {
  getAllServers,
  getAllImplementedTools,
  getServerById,
};
