import { Command } from "commander";
import chalk from "chalk";
import { getClient } from "../utils/client.js";
import { printTable, printJson } from "../utils/output.js";
import { error, success } from "../utils/spinner.js";
import { confirm } from "../utils/prompt.js";

export function registerKeysCommands(program: Command): void {
  const keys = program.command("keys").description("Manage API keys");

  keys
    .command("list")
    .alias("ls")
    .description("List all API keys")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      try {
        const client = getClient();
        const result = await client.keys().retrieve();

        if (options.json) {
          printJson(result);
          return;
        }

        if (!result.keys || result.keys.length === 0) {
          console.log(chalk.dim("No API keys found"));
          return;
        }

        const headers = ["ID", "Description", "Actions", "Collections", "Expires At"];
        const rows = result.keys.map((key) => [
          String(key.id),
          key.description || "-",
          key.actions?.join(", ") || "-",
          key.collections?.join(", ") || "*",
          key.expires_at ? new Date(key.expires_at * 1000).toISOString() : "Never",
        ]);

        printTable(headers, rows);
        console.log(chalk.dim(`\n${result.keys.length} key(s) total`));
      } catch (err) {
        error("Failed to fetch API keys");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  keys
    .command("create")
    .description("Create a new API key")
    .requiredOption("-d, --description <description>", "Key description")
    .requiredOption("-a, --actions <actions>", "Comma-separated actions (e.g., documents:search,collections:get)")
    .option("-c, --collections <collections>", "Comma-separated collection names (default: all)")
    .option("-e, --expires <days>", "Expiration in days from now")
    .action(async (options) => {
      try {
        const client = getClient();

        const actions = options.actions.split(",").map((a: string) => a.trim());
        const collections = options.collections
          ? options.collections.split(",").map((c: string) => c.trim())
          : ["*"];

        const keyParams = {
          description: options.description,
          actions,
          collections,
          expires_at: options.expires
            ? Math.floor(Date.now() / 1000) + Number.parseInt(options.expires, 10) * 24 * 60 * 60
            : undefined,
        };

        const result = await client.keys().create(keyParams);

        success("API key created");
        console.log(chalk.bold("\nKey Details:"));
        console.log(`  ID:          ${result.id}`);
        console.log(`  Description: ${result.description}`);
        console.log(`  Actions:     ${result.actions?.join(", ")}`);
        console.log(`  Collections: ${result.collections?.join(", ")}`);
        console.log(chalk.yellow(`\n  API Key:     ${result.value}`));
        console.log(chalk.dim("\n  Save this key - it won't be shown again!"));
      } catch (err) {
        error("Failed to create API key");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  keys
    .command("delete <id>")
    .alias("rm")
    .description("Delete an API key")
    .option("--force", "Skip confirmation")
    .action(async (id, options) => {
      if (!options.force) {
        console.log(chalk.yellow(`Warning: This will permanently delete API key "${id}".`));
        const confirmed = await confirm("Are you sure you want to delete?");
        if (!confirmed) {
          console.log(chalk.dim("Aborted."));
          process.exit(0);
        }
      }

      try {
        const client = getClient();
        await client.keys(Number.parseInt(id, 10)).delete();
        success(`API key "${id}" deleted`);
      } catch (err) {
        error(`Failed to delete API key "${id}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  keys
    .command("generate-scoped")
    .description("Generate a scoped search key")
    .requiredOption("-k, --key <key>", "Parent API key to scope from")
    .requiredOption("-f, --filter <filter>", "Filter expression to embed")
    .option("-e, --expires <seconds>", "Expiration in seconds from now", "3600")
    .action(async (options) => {
      try {
        const client = getClient();

        const scopedKey = client.keys().generateScopedSearchKey(options.key, {
          filter_by: options.filter,
          expires_at: Math.floor(Date.now() / 1000) + Number.parseInt(options.expires, 10),
        });

        console.log(chalk.bold("Scoped Search Key:"));
        console.log(scopedKey);
        console.log(chalk.dim(`\nFilter: ${options.filter}`));
        console.log(chalk.dim(`Expires: ${options.expires}s from now`));
      } catch (err) {
        error("Failed to generate scoped key");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
