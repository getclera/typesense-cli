#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import dotenv from "dotenv";
import { registerCollectionsCommands } from "./commands/collections.js";
import { registerDocumentsCommands } from "./commands/documents.js";
import { registerKeysCommands } from "./commands/keys.js";
import { registerHealthCommands } from "./commands/health.js";
import { registerAliasesCommands } from "./commands/aliases.js";
import { registerSyncCommands } from "./commands/sync.js";

// Load environment variables from .env file in current directory
dotenv.config();

const program = new Command();

program
  .name("typesense-cli")
  .description("A modern CLI for managing Typesense search clusters")
  .version("1.0.0")
  .configureOutput({
    writeErr: (str) => process.stderr.write(chalk.red(str)),
  });

// Register all command groups
registerCollectionsCommands(program);
registerDocumentsCommands(program);
registerKeysCommands(program);
registerHealthCommands(program);
registerAliasesCommands(program);
registerSyncCommands(program);

// Show help if no command provided
if (process.argv.length <= 2) {
  console.log(chalk.bold("\nTypesense CLI\n"));
  console.log("Environment variables required:");
  console.log("  TYPESENSE_HOST       Typesense server host");
  console.log("  TYPESENSE_PORT       Typesense server port (default: 443)");
  console.log("  TYPESENSE_PROTOCOL   Protocol (default: https)");
  console.log("  TYPESENSE_ADMIN_KEY  Admin API key\n");
  program.outputHelp();
  process.exit(0);
}

program.parse();
