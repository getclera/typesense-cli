# @clera/typesense-cli

A modern command-line interface for managing [Typesense](https://typesense.org/) search clusters.

## Features

- **Collections** - List, inspect, create, patch, and delete collections
- **Documents** - Search, export, count, and delete documents
- **API Keys** - Create, list, delete, and generate scoped search keys
- **Aliases** - Manage collection aliases for zero-downtime reindexing
- **Health** - Check server health and metrics

## Installation

```bash
npm install -g @clera/typesense-cli
```

Or with pnpm:
```bash
pnpm add -g @clera/typesense-cli
```

### From source

```bash
git clone https://github.com/getclera/typesense-cli.git
cd typesense-cli
pnpm install
pnpm build
pnpm link --global
```

## Configuration

Set environment variables to connect to your Typesense server:

```bash
export TYPESENSE_HOST=your-typesense-host.a1.typesense.net
export TYPESENSE_ADMIN_KEY=your-admin-api-key

# Optional (defaults shown)
export TYPESENSE_PORT=443
export TYPESENSE_PROTOCOL=https
```

Or create a `.env` file:

```env
TYPESENSE_HOST=your-typesense-host.a1.typesense.net
TYPESENSE_ADMIN_KEY=your-admin-api-key
```

## Usage

### Health Check

```bash
typesense-cli health
typesense-cli metrics
typesense-cli debug
```

### Collections

```bash
# List all collections
typesense-cli collections list

# Get collection details
typesense-cli collections get <name>

# Create from schema file
typesense-cli collections create <name> -s schema.json

# Patch collection schema
typesense-cli collections patch <name> -s update.json

# Add a field
typesense-cli collections add-field <collection> -n fieldName -t string --facet

# Drop a field
typesense-cli collections drop-field <collection> <field>

# Delete a collection
typesense-cli collections delete <name>
```

### Documents

```bash
# Search
typesense-cli docs search <collection> -q "query" -f "status:active"

# Get document
typesense-cli docs get <collection> <id>

# Count
typesense-cli docs count <collection> -f "status:active"

# Export (JSONL)
typesense-cli docs export <collection> --fields "id,name,email"

# Delete
typesense-cli docs delete <collection> <id>
typesense-cli docs delete-by-query <collection> -f "status:archived"
```

### API Keys

```bash
# List keys
typesense-cli keys list

# Create key
typesense-cli keys create -d "Search key" -a "documents:search" -c "products"

# Generate scoped key
typesense-cli keys generate-scoped -k <key> -f "tenant_id:abc123"

# Delete key
typesense-cli keys delete <id>
```

### Aliases

```bash
typesense-cli aliases list
typesense-cli aliases upsert <alias> <collection>
typesense-cli aliases delete <alias>
```

### Sync & Inspection

```bash
typesense-cli sync status
typesense-cli sync verify <collection>
typesense-cli sync facets <collection> -f "status"
typesense-cli sync drop <collection>
```

## Output Formats

Use `--json` for JSON output:

```bash
typesense-cli collections list --json
```

## Destructive Operations

Delete commands prompt for confirmation. Use `--force` to skip:

```bash
typesense-cli collections delete myCollection --force
```

## License

MIT - see [LICENSE](LICENSE)
