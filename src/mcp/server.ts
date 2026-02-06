import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerProcessTools } from "./tools/process.js";
import { registerGitHubTools } from "./tools/github.js";
import { registerGitTools } from "./tools/git.js";

export function registerAllTools(server: McpServer): void {
  registerProjectTools(server);
  registerProcessTools(server);
  registerGitHubTools(server);
  registerGitTools(server);
}
