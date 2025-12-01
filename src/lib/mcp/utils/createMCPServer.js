/**
 * Utility to create MCP servers with standardized structure
 */

/**
 * Creates an MCP server with tool registration capabilities
 * @param {Object} config - Server configuration
 * @param {string} config.id - Server identifier
 * @param {string} config.title - Server display title
 * @param {string} config.description - Server description
 * @param {string} config.version - Server version
 * @returns {Object} MCP server instance
 */
export function createMCPServer({ id, title, description, version }) {
  const tools = {};

  return {
    id,
    title,
    description,
    version,
    tools,

    /**
     * Register a tool with the server
     * @param {Object} toolConfig - Tool configuration
     * @param {string} toolConfig.name - Tool name
     * @param {string} toolConfig.description - Tool description
     * @param {Object} toolConfig.inputSchema - Zod schema for input validation
     * @param {boolean} toolConfig.isImplemented - Whether tool is implemented
     * @param {Function} toolConfig.execute - Tool execution function
     */
    registerTool({
      name,
      description,
      inputSchema,
      isImplemented = true,
      execute,
    }) {
      tools[name] = {
        name,
        description,
        inputSchema,
        isImplemented,
        execute,
      };
    },

    /**
     * Get all registered tools
     * @returns {Object} All registered tools
     */
    getTools() {
      return tools;
    },

    /**
     * Get only implemented tools
     * @returns {Object} Implemented tools only
     */
    getImplementedTools() {
      const implemented = {};
      for (const [name, tool] of Object.entries(tools)) {
        if (tool.isImplemented) {
          implemented[name] = tool;
        }
      }
      return implemented;
    },
  };
}
