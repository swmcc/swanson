import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitStatus, gitPull, gitFetch } from "../../lib/git.js";
import { getProjectConfig } from "../../lib/projects.js";

export function registerGitTools(server: McpServer): void {
  // Get git status
  server.tool(
    "swanson_git_status",
    "Get git status for a project (branch, changes, ahead/behind)",
    {
      projectName: z.string().describe("Project name"),
    },
    async ({ projectName }) => {
      const project = getProjectConfig(projectName);
      if (!project) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Project '${projectName}' not found` }),
          }],
          isError: true,
        };
      }

      const status = await getGitStatus(project.path);

      if (!status) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Not a git repository or git error" }),
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(status, null, 2),
        }],
      };
    }
  );

  // Git pull
  server.tool(
    "swanson_git_pull",
    "Pull latest changes for a project",
    {
      projectName: z.string().describe("Project name"),
    },
    async ({ projectName }) => {
      const project = getProjectConfig(projectName);
      if (!project) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Project '${projectName}' not found` }),
          }],
          isError: true,
        };
      }

      const result = await gitPull(project.path);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
        isError: !result.success,
      };
    }
  );

  // Git fetch
  server.tool(
    "swanson_git_fetch",
    "Fetch from remote for a project",
    {
      projectName: z.string().describe("Project name"),
    },
    async ({ projectName }) => {
      const project = getProjectConfig(projectName);
      if (!project) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Project '${projectName}' not found` }),
          }],
          isError: true,
        };
      }

      const result = await gitFetch(project.path);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
        isError: !result.success,
      };
    }
  );
}
