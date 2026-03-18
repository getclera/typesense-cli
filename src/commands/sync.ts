import { Command } from "commander";
import chalk from "chalk";
import { getClient, formatNumber } from "../utils/client.js";
import { printTable } from "../utils/output.js";
import { error, success, info } from "../utils/spinner.js";
import { confirm } from "../utils/prompt.js";

export function registerSyncCommands(program: Command): void {
  const sync = program.command("sync").description("Collection sync and inspection utilities");

  sync
    .command("status")
    .description("Show status for all collections")
    .action(async () => {
      try {
        const client = getClient();
        const allCollections = await client.collections().retrieve();

        console.log(chalk.bold("\nCollections Status"));
        console.log(chalk.dim("─".repeat(60)));

        if (allCollections.length === 0) {
          console.log(chalk.dim("No collections found"));
          return;
        }

        const headers = ["Collection", "Documents", "Fields", "Created At"];
        const rows = allCollections.map((col) => [
          col.name,
          formatNumber(col.num_documents || 0),
          String(col.fields?.length || 0),
          col.created_at ? new Date(col.created_at * 1000).toISOString() : "-",
        ]);

        printTable(headers, rows);

        const totalDocs = allCollections.reduce((sum, col) => sum + (col.num_documents || 0), 0);
        console.log(chalk.dim("─".repeat(60)));
        console.log(chalk.bold(`Total: ${formatNumber(totalDocs)} documents across ${allCollections.length} collections`));
      } catch (err) {
        error("Failed to fetch status");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  sync
    .command("verify <collection>")
    .description("Verify a collection schema and sample data")
    .action(async (collection) => {
      try {
        const client = getClient();
        const col = await client.collections(collection).retrieve();

        console.log(chalk.bold(`\nCollection: ${collection}`));
        console.log(chalk.dim("─".repeat(50)));

        const fields = col.fields || [];
        const facetFields = fields.filter((f) => f.facet);
        const indexedFields = fields.filter((f) => f.index !== false);
        const embeddingFields = fields.filter((f) => f.type === "float[]" && f.num_dim);

        console.log(`Total Fields:     ${fields.length}`);
        console.log(`Faceted Fields:   ${facetFields.length}`);
        console.log(`Indexed Fields:   ${indexedFields.length}`);
        console.log(`Embedding Fields: ${embeddingFields.length}`);

        if (embeddingFields.length > 0) {
          console.log(chalk.bold("\nEmbedding Fields:"));
          for (const f of embeddingFields) {
            console.log(`  ${f.name}: ${f.num_dim} dimensions`);
          }
        }

        try {
          const searchResult = await client.collections(collection).documents().search({
            q: "*",
            per_page: 1,
          });

          if (searchResult.hits && searchResult.hits.length > 0) {
            const sample = searchResult.hits[0].document as Record<string, unknown>;
            console.log(chalk.bold("\nSample Document Fields:"));
            const sampleKeys = Object.keys(sample).slice(0, 10);
            for (const key of sampleKeys) {
              const value = sample[key];
              const type = Array.isArray(value) ? "array" : typeof value;
              console.log(`  ${key}: ${type}`);
            }
            if (Object.keys(sample).length > 10) {
              console.log(chalk.dim(`  ... and ${Object.keys(sample).length - 10} more fields`));
            }
          }
        } catch {
          // Ignore search errors
        }

        success("Verification complete");
      } catch (err) {
        error(`Failed to verify collection "${collection}"`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  sync
    .command("facets <collection>")
    .description("List facet values for a collection")
    .option("-f, --field <field>", "Specific facet field to show")
    .option("-l, --limit <limit>", "Number of values per facet", "10")
    .action(async (collection, options) => {
      try {
        const client = getClient();
        const col = await client.collections(collection).retrieve();

        const facetFields = (col.fields || [])
          .filter((f) => f.facet)
          .map((f) => f.name);

        if (facetFields.length === 0) {
          console.log(chalk.dim("No faceted fields in this collection"));
          return;
        }

        const fieldsToQuery = options.field ? [options.field] : facetFields.slice(0, 5);

        const result = await client.collections(collection).documents().search({
          q: "*",
          facet_by: fieldsToQuery.join(","),
          max_facet_values: Number.parseInt(options.limit, 10),
          per_page: 0,
        });

        console.log(chalk.bold(`\nFacets for "${collection}"`));
        console.log(chalk.dim("─".repeat(50)));

        if (result.facet_counts) {
          for (const facet of result.facet_counts) {
            console.log(chalk.cyan(`\n${facet.field_name}:`));
            if (facet.counts.length === 0) {
              console.log(chalk.dim("  (no values)"));
            } else {
              for (const val of facet.counts) {
                console.log(`  ${val.value}: ${formatNumber(val.count)}`);
              }
            }
          }
        }

        if (!options.field && facetFields.length > 5) {
          console.log(chalk.dim(`\nShowing 5 of ${facetFields.length} faceted fields.`));
          console.log(chalk.dim("Use --field <name> to see a specific facet."));
          console.log(chalk.dim(`\nAll facet fields: ${facetFields.join(", ")}`));
        }
      } catch (err) {
        error("Failed to fetch facets");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  sync
    .command("drop <collection>")
    .description("Drop a collection (DANGEROUS)")
    .option("--force", "Skip confirmation")
    .action(async (collection, options) => {
      if (!options.force) {
        console.log(chalk.red.bold(`\nWARNING: This will permanently delete collection "${collection}" and all its data.`));
        const confirmed = await confirm("Are you sure you want to delete?");
        if (!confirmed) {
          console.log(chalk.dim("Aborted."));
          process.exit(0);
        }
      }

      try {
        const client = getClient();
        await client.collections(collection).delete();
        success(`Collection "${collection}" deleted`);
      } catch (err) {
        const typedErr = err as { httpStatus?: number };
        if (typedErr.httpStatus === 404) {
          info(`Collection "${collection}" not found (skipped)`);
        } else {
          error(`Failed to delete "${collection}"`);
          console.error(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      }
    });
}
