import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs";
import type { CollectionFieldSchema } from "typesense/lib/Typesense/Collection";
import { getClient, formatNumber } from "../utils/client.js";
import { printTable, printJson } from "../utils/output.js";
import { error, success } from "../utils/spinner.js";
import { confirm } from "../utils/prompt.js";

export function registerCollectionsCommands(program: Command): void {
  const collections = program.command("collections").description("Manage Typesense collections");

  collections
    .command("list")
    .alias("ls")
    .description("List all collections")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      try {
        const client = getClient();
        const result = await client.collections().retrieve();

        if (options.json) {
          printJson(result);
          return;
        }

        if (result.length === 0) {
          console.log(chalk.dim("No collections found"));
          return;
        }

        const headers = ["Name", "Documents", "Fields", "Created At"];
        const rows = result.map((col) => [
          col.name,
          formatNumber(col.num_documents || 0),
          String(col.fields?.length || 0),
          col.created_at ? new Date(col.created_at * 1000).toISOString() : "-",
        ]);

        printTable(headers, rows);
        console.log(chalk.dim(`\n${result.length} collection(s) total`));
      } catch (err) {
        error("Failed to fetch collections");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  collections
    .command("get <name>")
    .description("Get details of a specific collection")
    .option("--json", "Output as JSON")
    .action(async (name, options) => {
      try {
        const client = getClient();
        const collection = await client.collections(name).retrieve();

        if (options.json) {
          printJson(collection);
          return;
        }

        console.log(chalk.bold(`\nCollection: ${collection.name}`));
        console.log(chalk.dim("─".repeat(50)));
        console.log(`Documents:     ${formatNumber(collection.num_documents || 0)}`);
        console.log(`Fields:        ${collection.fields?.length || 0}`);
        console.log(
          `Created:       ${collection.created_at ? new Date(collection.created_at * 1000).toISOString() : "-"}`
        );
        console.log(`Default Sort:  ${collection.default_sorting_field || "-"}`);

        if (collection.fields && collection.fields.length > 0) {
          console.log(chalk.bold("\nFields:"));
          const fieldHeaders = ["Name", "Type", "Facet", "Index", "Optional"];
          const fieldRows = collection.fields.map((f) => [
            f.name,
            f.type,
            f.facet ? "yes" : "-",
            f.index === false ? "no" : "yes",
            f.optional ? "yes" : "-",
          ]);
          printTable(fieldHeaders, fieldRows);
        }
      } catch (err) {
        error(`Failed to fetch collection "${name}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  collections
    .command("delete <name>")
    .alias("rm")
    .description("Delete a collection")
    .option("--force", "Skip confirmation")
    .action(async (name, options) => {
      if (!options.force) {
        console.log(chalk.yellow(`Warning: This will permanently delete collection "${name}" and all its documents.`));
        const confirmed = await confirm("Are you sure you want to delete?");
        if (!confirmed) {
          console.log(chalk.dim("Aborted."));
          process.exit(0);
        }
      }

      try {
        const client = getClient();
        await client.collections(name).delete();
        console.log(chalk.green(`✓ Collection "${name}" deleted`));
      } catch (err) {
        error(`Failed to delete collection "${name}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  collections
    .command("stats")
    .description("Show statistics for all collections")
    .action(async () => {
      try {
        const client = getClient();
        const result = await client.collections().retrieve();

        if (result.length === 0) {
          console.log(chalk.dim("No collections found"));
          return;
        }

        let totalDocs = 0;

        const headers = ["Collection", "Documents", "Fields"];
        const rows = result.map((col) => {
          const docs = col.num_documents || 0;
          const fields = col.fields?.length || 0;
          totalDocs += docs;
          return [col.name, formatNumber(docs), String(fields)];
        });

        printTable(headers, rows);
        console.log(chalk.dim("─".repeat(50)));
        console.log(chalk.bold(`Total: ${formatNumber(totalDocs)} documents across ${result.length} collections`));
      } catch (err) {
        error("Failed to fetch statistics");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  collections
    .command("create <name>")
    .description("Create a new collection from a JSON schema file")
    .requiredOption("-s, --schema <file>", "Path to JSON schema file")
    .action(async (name, options) => {
      try {
        const schemaContent = fs.readFileSync(options.schema, "utf-8");
        const schema = JSON.parse(schemaContent);
        schema.name = name;

        const client = getClient();
        await client.collections().create(schema);
        success(`Collection "${name}" created`);
      } catch (err) {
        error(`Failed to create collection "${name}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  collections
    .command("patch <name>")
    .description("Update a collection schema from a JSON file")
    .requiredOption("-s, --schema <file>", "Path to JSON schema update file")
    .option("--force", "Skip confirmation")
    .action(async (name, options) => {
      try {
        const schemaContent = fs.readFileSync(options.schema, "utf-8");
        const schema = JSON.parse(schemaContent);

        console.log(chalk.bold(`\nPatching collection "${name}"`));
        console.log(chalk.dim("─".repeat(50)));
        console.log("Schema update:");
        printJson(schema);

        if (!options.force) {
          const confirmed = await confirm("\nApply this schema update?");
          if (!confirmed) {
            console.log(chalk.dim("Aborted."));
            process.exit(0);
          }
        }

        const client = getClient();
        const result = await client.collections(name).update(schema);
        success(`Collection "${name}" updated`);
        printJson(result);
      } catch (err) {
        error(`Failed to patch collection "${name}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  collections
    .command("add-field <collection>")
    .description("Add a new field to a collection")
    .requiredOption("-n, --name <name>", "Field name")
    .requiredOption("-t, --type <type>", "Field type (string, int32, float, bool, string[], etc.)")
    .option("--facet", "Enable faceting on this field")
    .option("--index", "Enable indexing (default: true)")
    .option("--optional", "Make field optional")
    .option("--force", "Skip confirmation")
    .action(async (collection, options) => {
      const field: Record<string, unknown> = {
        name: options.name,
        type: options.type,
      };

      if (options.facet) field.facet = true;
      if (options.index === false) field.index = false;
      if (options.optional) field.optional = true;

      console.log(chalk.bold(`\nAdding field to "${collection}"`));
      console.log(chalk.dim("─".repeat(50)));
      printJson(field);

      if (!options.force) {
        const confirmed = await confirm("\nAdd this field?");
        if (!confirmed) {
          console.log(chalk.dim("Aborted."));
          process.exit(0);
        }
      }

      try {
        const client = getClient();
        await client.collections(collection).update({
          fields: [field as unknown as CollectionFieldSchema],
        });
        success(`Field "${options.name}" added to "${collection}"`);
      } catch (err) {
        error(`Failed to add field to "${collection}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  collections
    .command("drop-field <collection> <field>")
    .description("Remove a field from a collection")
    .option("--force", "Skip confirmation")
    .action(async (collection, field, options) => {
      console.log(chalk.yellow(`\nWarning: This will remove field "${field}" from collection "${collection}".`));
      console.log(chalk.dim("Existing data in this field will be lost."));

      if (!options.force) {
        const confirmed = await confirm("\nAre you sure you want to drop this field?");
        if (!confirmed) {
          console.log(chalk.dim("Aborted."));
          process.exit(0);
        }
      }

      try {
        const client = getClient();
        await client.collections(collection).update({
          fields: [{ name: field, drop: true } as { name: string; drop: true }],
        });
        success(`Field "${field}" dropped from "${collection}"`);
      } catch (err) {
        error(`Failed to drop field from "${collection}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
