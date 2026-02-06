import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHub } from "../../lib/github.js";
import { getProjectConfig } from "../../lib/projects.js";

export function registerGitHubTools(server: McpServer): void {
  // Check GitHub CLI status
  server.tool(
    "swanson_gh_status",
    "Check GitHub CLI status for a project (installed, authenticated)",
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

      const github = new GitHub(project.path);
      const result = await github.checkStatus();

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // List issues
  server.tool(
    "swanson_gh_issues",
    "List GitHub issues for a project",
    {
      projectName: z.string().describe("Project name"),
      state: z.enum(["open", "closed", "all"]).optional().describe("Issue state filter (default: open)"),
      limit: z.number().optional().describe("Max issues to return (default: 30)"),
    },
    async ({ projectName, state = "open", limit = 30 }) => {
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

      const github = new GitHub(project.path);
      const result = await github.listIssues(state, limit);

      if (!result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: result.error }),
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        }],
      };
    }
  );

  // Get issue details
  server.tool(
    "swanson_gh_issue",
    "Get detailed information about a specific GitHub issue",
    {
      projectName: z.string().describe("Project name"),
      issueNumber: z.number().describe("Issue number"),
    },
    async ({ projectName, issueNumber }) => {
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

      const github = new GitHub(project.path);
      const result = await github.getIssue(issueNumber);

      if (!result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: result.error }),
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        }],
      };
    }
  );

  // List PRs
  server.tool(
    "swanson_gh_prs",
    "List GitHub pull requests for a project",
    {
      projectName: z.string().describe("Project name"),
      state: z.enum(["open", "closed", "all"]).optional().describe("PR state filter (default: open)"),
      limit: z.number().optional().describe("Max PRs to return (default: 30)"),
    },
    async ({ projectName, state = "open", limit = 30 }) => {
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

      const github = new GitHub(project.path);
      const result = await github.listPRs(state, limit);

      if (!result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: result.error }),
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        }],
      };
    }
  );

  // Quick stats
  server.tool(
    "swanson_gh_stats",
    "Get quick GitHub stats (open issues and PRs) for a project",
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

      const github = new GitHub(project.path);
      const result = await github.getQuickStats();

      if (!result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: result.error }),
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        }],
      };
    }
  );
}
