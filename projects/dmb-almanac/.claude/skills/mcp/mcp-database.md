---
name: mcp-database
description: Database operations via MCP with query execution, schema introspection, and connection management
version: 1.0.0
mcp-version: "1.0"
sdk: typescript, python
partner-ready: true
---

# MCP Database Integration

## Overview

Database MCP servers provide safe, efficient access to database operations including queries, schema introspection, and migrations while enforcing security constraints.

## Architecture

```
┌─────────────────────────────────────┐
│      Database MCP Server            │
│  ┌───────────────────────────────┐  │
│  │   Security Layer              │  │
│  │  - Query validation           │  │
│  │  - Read-only enforcement      │  │
│  │  - Row limits                 │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   Connection Pool             │  │
│  │  - Pooling                    │  │
│  │  - Failover                   │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   Query Engine                │  │
│  │  - Execute  - Schema          │  │
│  │  - Migrate  - Analyze         │  │
│  └───────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│         Database(s)                 │
└─────────────────────────────────────┘
```

## PostgreSQL Server

```typescript
// src/postgres-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Pool, PoolClient } from "pg";
import { z } from "zod";

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Security: Validate queries are read-only
function isReadOnlyQuery(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();
  const readOnlyPatterns = /^(SELECT|SHOW|DESCRIBE|EXPLAIN)/;
  const dangerousPatterns = /(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)/i;

  return readOnlyPatterns.test(normalized) && !dangerousPatterns.test(sql);
}

const server = new Server(
  {
    name: "postgres-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

const tools = [
  {
    name: "query",
    description: "Execute a read-only SQL query",
    inputSchema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "SQL SELECT query",
        },
        params: {
          type: "array",
          items: {},
          description: "Query parameters for prepared statements",
        },
        limit: {
          type: "number",
          description: "Maximum rows to return",
          default: 100,
          maximum: 1000,
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "list_tables",
    description: "List all tables in the database",
    inputSchema: {
      type: "object",
      properties: {
        schema: {
          type: "string",
          description: "Schema name",
          default: "public",
        },
      },
    },
  },
  {
    name: "describe_table",
    description: "Get table schema information",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Table name",
        },
        schema: {
          type: "string",
          description: "Schema name",
          default: "public",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "table_stats",
    description: "Get table statistics",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Table name",
        },
        schema: {
          type: "string",
          default: "public",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "explain_query",
    description: "Get query execution plan",
    inputSchema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "SQL query to analyze",
        },
        analyze: {
          type: "boolean",
          description: "Run EXPLAIN ANALYZE",
          default: false,
        },
      },
      required: ["sql"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    switch (name) {
      case "query": {
        const { sql, params = [], limit = 100 } = args as any;

        // Validate read-only
        if (!isReadOnlyQuery(sql)) {
          throw new Error(
            "Only SELECT queries are allowed. Use read-only operations."
          );
        }

        // Add LIMIT if not present
        let finalSql = sql;
        if (!sql.toUpperCase().includes("LIMIT")) {
          finalSql += ` LIMIT ${Math.min(limit, 1000)}`;
        }

        const result = await client.query(finalSql, params);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  rows: result.rows,
                  rowCount: result.rowCount,
                  fields: result.fields.map((f) => ({
                    name: f.name,
                    dataType: f.dataTypeID,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_tables": {
        const { schema = "public" } = args as any;

        const result = await client.query(
          `
          SELECT
            table_name,
            table_type
          FROM information_schema.tables
          WHERE table_schema = $1
          ORDER BY table_name
          `,
          [schema]
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "describe_table": {
        const { table, schema = "public" } = args as any;

        const result = await client.query(
          `
          SELECT
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
          `,
          [schema, table]
        );

        // Get indexes
        const indexes = await client.query(
          `
          SELECT
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname = $1 AND tablename = $2
          `,
          [schema, table]
        );

        // Get foreign keys
        const foreignKeys = await client.query(
          `
          SELECT
            conname AS constraint_name,
            conrelid::regclass AS table_name,
            confrelid::regclass AS foreign_table_name,
            pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE contype = 'f'
            AND connamespace = $1::regnamespace
            AND conrelid = $2::regclass
          `,
          [schema, `${schema}.${table}`]
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  columns: result.rows,
                  indexes: indexes.rows,
                  foreignKeys: foreignKeys.rows,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "table_stats": {
        const { table, schema = "public" } = args as any;

        const result = await client.query(
          `
          SELECT
            schemaname,
            tablename,
            n_live_tup AS row_count,
            n_dead_tup AS dead_rows,
            last_vacuum,
            last_autovacuum,
            last_analyze,
            last_autoanalyze
          FROM pg_stat_user_tables
          WHERE schemaname = $1 AND tablename = $2
          `,
          [schema, table]
        );

        // Get table size
        const size = await client.query(
          `
          SELECT
            pg_size_pretty(pg_total_relation_size($1)) AS total_size,
            pg_size_pretty(pg_relation_size($1)) AS table_size,
            pg_size_pretty(pg_indexes_size($1)) AS indexes_size
          `,
          [`${schema}.${table}`]
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  stats: result.rows[0],
                  size: size.rows[0],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "explain_query": {
        const { sql, analyze = false } = args as any;

        if (!isReadOnlyQuery(sql)) {
          throw new Error("Only SELECT queries can be explained");
        }

        const explainSql = analyze
          ? `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`
          : `EXPLAIN (FORMAT JSON) ${sql}`;

        const result = await client.query(explainSql);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows[0], null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Database error: ${error.message}`,
        },
      ],
      isError: true,
    };
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Resources: Expose database schemas
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `);

    return {
      resources: result.rows.map((row) => ({
        uri: `postgres://schema/${row.schema_name}`,
        name: row.schema_name,
        description: `Schema: ${row.schema_name}`,
        mimeType: "application/json",
      })),
    };
  } finally {
    client.release();
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (!uri.startsWith("postgres://schema/")) {
    throw new Error("Invalid resource URI");
  }

  const schema = uri.slice("postgres://schema/".length);
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
      `,
      [schema]
    );

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(result.rows, null, 2),
        },
      ],
    };
  } finally {
    client.release();
  }
});

// Cleanup on shutdown
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PostgreSQL MCP Server running");
}

main();
```

## MySQL Server

```typescript
// src/mysql-server.ts
import mysql from "mysql2/promise";
import { z } from "zod";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Similar tool implementations for MySQL
async function queryMySQL(sql: string, params: any[] = [], limit = 100) {
  if (!isReadOnlyQuery(sql)) {
    throw new Error("Only SELECT queries are allowed");
  }

  const connection = await pool.getConnection();
  try {
    const [rows, fields] = await connection.query(sql, params);
    return {
      rows: Array.isArray(rows) ? rows.slice(0, limit) : [],
      fields: fields?.map((f: any) => ({
        name: f.name,
        type: f.type,
      })),
    };
  } finally {
    connection.release();
  }
}
```

## MongoDB Server

```typescript
// src/mongodb-server.ts
import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");

const tools = [
  {
    name: "find",
    description: "Query documents from a collection",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        collection: { type: "string" },
        filter: { type: "object", description: "Query filter" },
        projection: { type: "object", description: "Fields to include/exclude" },
        limit: { type: "number", default: 100, maximum: 1000 },
        sort: { type: "object", description: "Sort order" },
      },
      required: ["database", "collection"],
    },
  },
  {
    name: "aggregate",
    description: "Run aggregation pipeline",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        collection: { type: "string" },
        pipeline: {
          type: "array",
          items: { type: "object" },
          description: "Aggregation pipeline stages",
        },
      },
      required: ["database", "collection", "pipeline"],
    },
  },
  {
    name: "count_documents",
    description: "Count documents matching filter",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        collection: { type: "string" },
        filter: { type: "object" },
      },
      required: ["database", "collection"],
    },
  },
];

async function handleMongoQuery(name: string, args: any) {
  await client.connect();

  const db = client.db(args.database);
  const collection = db.collection(args.collection);

  switch (name) {
    case "find": {
      const cursor = collection.find(args.filter || {});

      if (args.projection) cursor.project(args.projection);
      if (args.sort) cursor.sort(args.sort);
      if (args.limit) cursor.limit(Math.min(args.limit, 1000));

      const documents = await cursor.toArray();
      return JSON.stringify(documents, null, 2);
    }

    case "aggregate": {
      const cursor = collection.aggregate(args.pipeline);
      const documents = await cursor.toArray();
      return JSON.stringify(documents, null, 2);
    }

    case "count_documents": {
      const count = await collection.countDocuments(args.filter || {});
      return JSON.stringify({ count });
    }
  }
}
```

## Schema Introspection

```typescript
// src/schema-introspection.ts
export class SchemaIntrospector {
  constructor(private pool: Pool) {}

  async getFullSchema(schema = "public") {
    const tables = await this.getTables(schema);
    const result: any = {};

    for (const table of tables) {
      result[table.table_name] = {
        type: table.table_type,
        columns: await this.getColumns(schema, table.table_name),
        indexes: await this.getIndexes(schema, table.table_name),
        constraints: await this.getConstraints(schema, table.table_name),
        statistics: await this.getTableStats(schema, table.table_name),
      };
    }

    return result;
  }

  private async getTables(schema: string) {
    const result = await this.pool.query(
      `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
      `,
      [schema]
    );
    return result.rows;
  }

  private async getColumns(schema: string, table: string) {
    const result = await this.pool.query(
      `
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
      `,
      [schema, table]
    );
    return result.rows;
  }

  private async getIndexes(schema: string, table: string) {
    const result = await this.pool.query(
      `
      SELECT
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = $1 AND t.relname = $2
      `,
      [schema, table]
    );
    return result.rows;
  }

  private async getConstraints(schema: string, table: string) {
    const result = await this.pool.query(
      `
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE connamespace = $1::regnamespace
        AND conrelid = $2::regclass
      `,
      [schema, `${schema}.${table}`]
    );
    return result.rows;
  }

  private async getTableStats(schema: string, table: string) {
    const result = await this.pool.query(
      `
      SELECT
        n_live_tup AS row_count,
        n_dead_tup AS dead_rows,
        pg_size_pretty(pg_total_relation_size($1)) AS total_size
      FROM pg_stat_user_tables
      WHERE schemaname = $2 AND tablename = $3
      `,
      [`${schema}.${table}`, schema, table]
    );
    return result.rows[0];
  }
}
```

## Migration Support

```typescript
// src/migrations.ts
import fs from "fs/promises";
import path from "path";
import { Pool } from "pg";

export class MigrationRunner {
  constructor(
    private pool: Pool,
    private migrationsDir: string
  ) {}

  async createMigrationsTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getAppliedMigrations(): Promise<string[]> {
    const result = await this.pool.query(
      "SELECT version FROM schema_migrations ORDER BY version"
    );
    return result.rows.map((row) => row.version);
  }

  async getPendingMigrations(): Promise<string[]> {
    const applied = await this.getAppliedMigrations();
    const files = await fs.readdir(this.migrationsDir);

    const migrations = files
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.replace(".sql", ""))
      .sort();

    return migrations.filter((m) => !applied.includes(m));
  }

  async runMigration(version: string) {
    const filePath = path.join(this.migrationsDir, `${version}.sql`);
    const sql = await fs.readFile(filePath, "utf-8");

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [version]
      );
      await client.query("COMMIT");
      console.log(`Migration ${version} applied successfully`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async runPendingMigrations() {
    await this.createMigrationsTable();
    const pending = await this.getPendingMigrations();

    for (const migration of pending) {
      await this.runMigration(migration);
    }

    return pending;
  }
}
```

## Connection Pooling

```typescript
// src/connection-pool.ts
import { Pool, PoolConfig } from "pg";

export class DatabasePool {
  private pool: Pool;
  private healthCheckInterval: NodeJS.Timer;

  constructor(config: PoolConfig) {
    this.pool = new Pool({
      ...config,
      max: config.max || 20,
      min: config.min || 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Setup health checks
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, 60000);

    // Handle pool errors
    this.pool.on("error", (err) => {
      console.error("Unexpected pool error:", err);
    });
  }

  async query(sql: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(sql, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms): ${sql}`);
      }

      return result;
    } catch (error) {
      console.error("Query error:", error);
      throw error;
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async healthCheck() {
    try {
      await this.pool.query("SELECT 1");
    } catch (error) {
      console.error("Database health check failed:", error);
    }
  }

  async getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  async shutdown() {
    clearInterval(this.healthCheckInterval);
    await this.pool.end();
  }
}
```

## Query Builder

```typescript
// src/query-builder.ts
export class QueryBuilder {
  private selectFields: string[] = ["*"];
  private fromTable: string = "";
  private whereConditions: string[] = [];
  private orderByFields: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private params: any[] = [];

  select(...fields: string[]) {
    this.selectFields = fields;
    return this;
  }

  from(table: string) {
    this.fromTable = table;
    return this;
  }

  where(condition: string, ...params: any[]) {
    this.whereConditions.push(condition);
    this.params.push(...params);
    return this;
  }

  orderBy(field: string, direction: "ASC" | "DESC" = "ASC") {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  offset(count: number) {
    this.offsetValue = count;
    return this;
  }

  build(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields.join(", ")} FROM ${this.fromTable}`;

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(" AND ")}`;
    }

    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(", ")}`;
    }

    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params: this.params };
  }
}

// Usage
const query = new QueryBuilder()
  .select("id", "name", "email")
  .from("users")
  .where("age > $1", 18)
  .where("status = $2", "active")
  .orderBy("created_at", "DESC")
  .limit(10)
  .build();
```

## Best Practices

1. **Read-Only by Default**: Enforce read-only queries for safety
2. **Connection Pooling**: Use connection pools for efficiency
3. **Query Limits**: Always enforce row limits
4. **Prepared Statements**: Use parameterized queries to prevent SQL injection
5. **Transaction Management**: Handle transactions properly
6. **Error Handling**: Provide meaningful error messages
7. **Performance Monitoring**: Track slow queries
8. **Schema Validation**: Validate table and column names
9. **Resource Cleanup**: Always release connections
10. **Health Checks**: Monitor database connectivity

## Security Checklist

- [ ] Database credentials stored securely
- [ ] Read-only mode enforced
- [ ] SQL injection prevention (parameterized queries)
- [ ] Row limits enforced
- [ ] Query timeouts configured
- [ ] Connection limits set
- [ ] Sensitive data not logged
- [ ] Schema access restricted
- [ ] Audit logging enabled
- [ ] SSL/TLS enabled for connections
