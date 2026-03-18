import { Command } from "commander";
import chalk from "chalk";
import { getClient } from "../utils/client.js";
import { printTable, printJson } from "../utils/output.js";
import { error, success } from "../utils/spinner.js";
import { confirm } from "../utils/prompt.js";

export function registerAliasesCommands(program: Command): void {
  const aliases = program.command("aliases").description("Manage collection aliases");

  aliases
    .command("list")
    .alias("ls")
    .description("List all aliases")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      try {
        const client = getClient();
        const result = await client.aliases().retrieve();

        if (options.json) {
          printJson(result);
          return;
        }

        if (!result.aliases || result.aliases.length === 0) {
          console.log(chalk.dim("No aliases found"));
          return;
        }

        const headers = ["Alias", "Collection"];
        const rows = result.aliases.map((alias) => [alias.name, alias.collection_name]);

        printTable(headers, rows);
      } catch (err) {
        error("Failed to fetch aliases");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  aliases
    .command("get <name>")
    .description("Get alias details")
    .action(async (name) => {
      try {
        const client = getClient();
        const alias = await client.aliases(name).retrieve();
        printJson(alias);
      } catch (err) {
        error(`Failed to fetch alias "${name}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  aliases
    .command("upsert <name> <collection>")
    .description("Create or update an alias")
    .action(async (name, collection) => {
      try {
        const client = getClient();
        await client.aliases().upsert(name, { collection_name: collection });
        success(`Alias "${name}" now points to "${collection}"`);
      } catch (err) {
        error(`Failed to upsert alias "${name}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  aliases
    .command("delete <name>")
    .alias("rm")
    .description("Delete an alias")
    .option("--force", "Skip confirmation")
    .action(async (name, options) => {
      if (!options.force) {
        console.log(chalk.yellow(`Warning: This will delete alias "${name}".`));
        const confirmed = await confirm("Are you sure you want to delete?");
        if (!confirmed) {
          console.log(chalk.dim("Aborted."));
          process.exit(0);
        }
      }

      try {
        const client = getClient();
        await client.aliases(name).delete();
        success(`Alias "${name}" deleted`);
      } catch (err) {
        error(`Failed to delete alias "${name}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
