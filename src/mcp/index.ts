#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./server.js";

const server = new McpServer({
  name: "swanson",
  version: "0.1.0",
});

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

// Log to stderr (never stdout - that's for MCP protocol)
console.error("[swanson-mcp] Server started");
