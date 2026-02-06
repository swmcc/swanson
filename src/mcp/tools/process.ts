import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { processManager, ServiceProcess } from "../../lib/process.js";
import { getProjectConfig } from "../../lib/projects.js";

// Serialize ServiceProcess for JSON output (exclude ChildProcess handle)
function serializeProcess(p: ServiceProcess) {
  return {
    id: p.id,
    name: p.name,
    command: p.command,
    cwd: p.cwd,
    status: p.status,
    pid: p.pid,
    error: p.error,
    logCount: p.logs.length,
  };
}

export function registerProcessTools(server: McpServer): void {
  // List all processes
  server.tool(
    "swanson_list_processes",
    "List all running and tracked processes",
    {},
    async () => {
      const processes = processManager.getAllServices().map(serializeProcess);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(processes, null, 2),
        }],
      };
    }
  );

  // Get specific process
  server.tool(
    "swanson_get_process",
    "Get status of a specific process",
    {
      processId: z.string().describe("Process ID (format: 'projectName:target')"),
    },
    async ({ processId }) => {
      const service = processManager.getService(processId);
      if (!service) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Process '${processId}' not found` }),
          }],
          isError: true,
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify(serializeProcess(service), null, 2),
        }],
      };
    }
  );

  // Start a process
  server.tool(
    "swanson_start_process",
    "Start a make target as a background process for a project",
    {
      projectName: z.string().describe("Project name"),
      target: z.string().describe("Make target (e.g., 'local.dev')"),
    },
    async ({ projectName, target }) => {
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

      const processId = `${projectName}:${target}`;
      const service = await processManager.start(processId, target, `make ${target}`, project.path);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(serializeProcess(service), null, 2),
        }],
      };
    }
  );

  // Stop a process
  server.tool(
    "swanson_stop_process",
    "Stop a running process",
    {
      processId: z.string().describe("Process ID (format: 'projectName:target')"),
    },
    async ({ processId }) => {
      const service = processManager.getService(processId);
      if (!service) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Process '${processId}' not found` }),
          }],
          isError: true,
        };
      }

      await processManager.stop(processId);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, message: `Process '${processId}' stopped` }),
        }],
      };
    }
  );

  // Stop all processes
  server.tool(
    "swanson_stop_all",
    "Stop all running processes",
    {},
    async () => {
      await processManager.stopAll();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, message: "All processes stopped" }),
        }],
      };
    }
  );

  // Get logs
  server.tool(
    "swanson_get_logs",
    "Get logs for a process",
    {
      processId: z.string().describe("Process ID (format: 'projectName:target')"),
      lines: z.number().optional().describe("Number of lines to return (default: all, max: 500)"),
    },
    async ({ processId, lines }) => {
      const service = processManager.getService(processId);
      if (!service) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Process '${processId}' not found` }),
          }],
          isError: true,
        };
      }

      const limit = lines ? Math.min(lines, 500) : 500;
      const logs = processManager.getLogs(processId, limit);

      return {
        content: [{
          type: "text",
          text: logs.length > 0 ? logs.join("\n") : "(no logs)",
        }],
      };
    }
  );
}
