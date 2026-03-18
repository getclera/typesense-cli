import { Command } from "commander";
import chalk from "chalk";
import { getClient, getConfig } from "../utils/client.js";
import { printJson } from "../utils/output.js";
import { success, error } from "../utils/spinner.js";

export function registerHealthCommands(program: Command): void {
  program
    .command("health")
    .description("Check Typesense server health")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      try {
        const client = getClient();
        const health = await client.health.retrieve();
        const config = getConfig();

        if (options.json) {
          printJson(health);
          return;
        }

        if (health.ok) {
          success("Server is healthy");
        } else {
          error("Server is unhealthy");
        }

        console.log(chalk.dim("─".repeat(40)));
        console.log(`Host:     ${config.host}:${config.port}`);
        console.log(`Protocol: ${config.protocol}`);
      } catch (err) {
        error("Health check failed");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command("metrics")
    .description("Get server metrics")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      try {
        const client = getClient();
        const metrics = await client.metrics.retrieve();

        if (options.json) {
          printJson(metrics);
          return;
        }

        console.log(chalk.bold("Typesense Server Metrics"));
        console.log(chalk.dim("─".repeat(40)));

        const metricsObj = metrics as unknown as Record<string, unknown>;
        const keyMetrics = [
          "system_cpu_active_percentage",
          "system_memory_used_bytes",
          "system_disk_used_bytes",
          "typesense_memory_active_bytes",
          "typesense_memory_allocated_bytes",
        ];

        for (const key of keyMetrics) {
          if (key in metricsObj) {
            const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
            console.log(`${label}: ${metricsObj[key]}`);
          }
        }
      } catch (err) {
        error("Failed to fetch metrics");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command("debug")
    .description("Get debug information")
    .action(async () => {
      try {
        const client = getClient();
        const debug = await client.debug.retrieve();
        printJson(debug);
      } catch (err) {
        error("Failed to fetch debug info");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
