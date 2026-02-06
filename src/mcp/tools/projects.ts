import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PROJECTS, getProjectConfig } from "../../lib/projects.js";
import { parseMakefile } from "../../lib/makefile.js";

export function registerProjectTools(server: McpServer): void {
  // List all projects
  server.tool(
    "swanson_list_projects",
    "List all configured development projects in Swanson",
    {},
    async () => {
      return {
        content: [{
          type: "text",
          text: JSON.stringify(PROJECTS, null, 2),
        }],
      };
    }
  );

  // Get specific project
  server.tool(
    "swanson_get_project",
    "Get details for a specific project by name",
    {
      name: z.string().describe("Project name (e.g., 'funeralsni', 'jotter')"),
    },
    async ({ name }) => {
      const project = getProjectConfig(name);
      if (!project) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Project '${name}' not found` }),
          }],
          isError: true,
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify(project, null, 2),
        }],
      };
    }
  );

  // List make targets for a project
  server.tool(
    "swanson_list_targets",
    "List available make targets (local.*) for a project",
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

      const targets = await parseMakefile(project.path);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(targets, null, 2),
        }],
      };
    }
  );
}
