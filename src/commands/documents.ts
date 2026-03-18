import { Command } from "commander";
import chalk from "chalk";
import { getClient, formatNumber } from "../utils/client.js";
import { printJson } from "../utils/output.js";
import { error, success } from "../utils/spinner.js";
import { confirm } from "../utils/prompt.js";

export function registerDocumentsCommands(program: Command): void {
  const documents = program.command("documents").alias("docs").description("Manage documents in collections");

  documents
    .command("search <collection>")
    .description("Search documents in a collection")
    .option("-q, --query <query>", "Search query", "*")
    .option("-f, --filter <filter>", "Filter expression")
    .option("-s, --sort <sort>", "Sort expression")
    .option("-l, --limit <limit>", "Number of results", "10")
    .option("-p, --page <page>", "Page number", "1")
    .option("--fields <fields>", "Comma-separated list of fields to return")
    .option("--facets <facets>", "Comma-separated list of facet fields")
    .option("--json", "Output as JSON")
    .action(async (collection, options) => {
      try {
        const client = getClient();

        const searchParams: Record<string, unknown> = {
          q: options.query,
          query_by: "*",
          per_page: Number.parseInt(options.limit, 10),
          page: Number.parseInt(options.page, 10),
        };

        if (options.filter) searchParams.filter_by = options.filter;
        if (options.sort) searchParams.sort_by = options.sort;
        if (options.fields) searchParams.include_fields = options.fields;
        if (options.facets) searchParams.facet_by = options.facets;

        const result = await client.collections(collection).documents().search(searchParams);

        if (options.json) {
          printJson(result);
          return;
        }

        console.log(chalk.bold(`\nSearch Results: ${formatNumber(result.found || 0)} found`));
        console.log(chalk.dim(`Showing ${result.hits?.length || 0} of ${result.found || 0} (page ${result.page})`));
        console.log(chalk.dim("─".repeat(60)));

        if (result.hits && result.hits.length > 0) {
          for (const hit of result.hits) {
            const doc = hit.document as Record<string, unknown>;
            const id = doc.id || doc.job_id || doc.talent_id || "unknown";
            console.log(chalk.cyan(`\nID: ${id}`));

            const keyFields = ["name", "full_name", "position", "title", "company_name", "status", "email"];
            for (const field of keyFields) {
              if (doc[field]) console.log(`  ${field}: ${doc[field]}`);
            }
          }
        } else {
          console.log(chalk.dim("No results found"));
        }

        if (result.facet_counts && result.facet_counts.length > 0) {
          console.log(chalk.bold("\nFacets:"));
          for (const facet of result.facet_counts) {
            console.log(chalk.cyan(`\n  ${facet.field_name}:`));
            for (const val of facet.counts.slice(0, 5)) {
              console.log(`    ${val.value}: ${val.count}`);
            }
          }
        }
      } catch (err) {
        error("Search failed");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  documents
    .command("get <collection> <id>")
    .description("Get a specific document by ID")
    .action(async (collection, id) => {
      try {
        const client = getClient();
        const doc = await client.collections(collection).documents(id).retrieve();
        printJson(doc);
      } catch (err) {
        error("Failed to fetch document");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  documents
    .command("delete <collection> <id>")
    .alias("rm")
    .description("Delete a specific document by ID")
    .option("--force", "Skip confirmation")
    .action(async (collection, id, options) => {
      if (!options.force) {
        console.log(chalk.yellow(`Warning: This will permanently delete document "${id}" from "${collection}".`));
        const confirmed = await confirm("Are you sure you want to delete?");
        if (!confirmed) {
          console.log(chalk.dim("Aborted."));
          process.exit(0);
        }
      }

      try {
        const client = getClient();
        await client.collections(collection).documents(id).delete();
        success(`Document "${id}" deleted from "${collection}"`);
      } catch (err) {
        error("Failed to delete document");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  documents
    .command("delete-by-query <collection>")
    .description("Delete documents matching a filter")
    .requiredOption("-f, --filter <filter>", "Filter expression (required)")
    .option("--force", "Skip confirmation")
    .action(async (collection, options) => {
      if (!options.force) {
        console.log(
          chalk.yellow(`Warning: This will delete all documents matching filter "${options.filter}" from "${collection}".`)
        );
        const confirmed = await confirm("Are you sure you want to delete?");
        if (!confirmed) {
          console.log(chalk.dim("Aborted."));
          process.exit(0);
        }
      }

      try {
        const client = getClient();
        const result = await client.collections(collection).documents().delete({
          filter_by: options.filter,
        });
        success(`Deleted ${result.num_deleted} document(s) from "${collection}"`);
      } catch (err) {
        error("Failed to delete documents");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  documents
    .command("count <collection>")
    .description("Count documents in a collection")
    .option("-f, --filter <filter>", "Filter expression")
    .action(async (collection, options) => {
      try {
        const client = getClient();

        const searchParams: Record<string, unknown> = {
          q: "*",
          query_by: "*",
          per_page: 0,
        };

        if (options.filter) searchParams.filter_by = options.filter;

        const result = await client.collections(collection).documents().search(searchParams);
        console.log(`${formatNumber(result.found || 0)} document(s)`);
      } catch (err) {
        error("Failed to count documents");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  documents
    .command("export <collection>")
    .description("Export documents from a collection")
    .option("-f, --filter <filter>", "Filter expression")
    .option("-l, --limit <limit>", "Maximum number of documents")
    .option("--fields <fields>", "Comma-separated list of fields to include")
    .action(async (collection, options) => {
      try {
        const client = getClient();

        const exportParams: Record<string, unknown> = {};
        if (options.filter) exportParams.filter_by = options.filter;
        if (options.fields) exportParams.include_fields = options.fields;

        const result = await client.collections(collection).documents().export(exportParams);
        const lines = result.split("\n").filter((line) => line.trim());

        let count = 0;
        const limit = options.limit ? Number.parseInt(options.limit, 10) : Number.POSITIVE_INFINITY;

        for (const line of lines) {
          if (count >= limit) break;
          console.log(line);
          count++;
        }

        console.error(chalk.dim(`\nExported ${count} document(s)`));
      } catch (err) {
        error("Export failed");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
