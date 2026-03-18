import { Client } from "typesense";
import chalk from "chalk";

interface TypesenseConfig {
  host: string;
  port: number;
  protocol: string;
  apiKey: string;
}

let cachedClient: Client | null = null;

export function getConfig(): TypesenseConfig {
  const host = process.env.TYPESENSE_HOST;
  const port = process.env.TYPESENSE_PORT;
  const protocol = process.env.TYPESENSE_PROTOCOL || "https";
  const apiKey = process.env.TYPESENSE_ADMIN_KEY;

  if (!host) {
    console.error(chalk.red("Error: TYPESENSE_HOST environment variable is required"));
    process.exit(1);
  }

  if (!apiKey) {
    console.error(chalk.red("Error: TYPESENSE_ADMIN_KEY environment variable is required"));
    process.exit(1);
  }

  return {
    host,
    port: port ? Number.parseInt(port, 10) : 443,
    protocol,
    apiKey,
  };
}

export function getClient(): Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getConfig();

  cachedClient = new Client({
    nodes: [
      {
        host: config.host,
        port: config.port,
        protocol: config.protocol,
      },
    ],
    apiKey: config.apiKey,
    connectionTimeoutSeconds: 15,
    retryIntervalSeconds: 0.1,
    numRetries: 3,
  });

  return cachedClient;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}
