---
name: mcp-memory
description: Knowledge graph and memory management via MCP for entity tracking, relationship mapping, and context persistence
version: 1.0.0
mcp-version: "1.0"
sdk: typescript, python
partner-ready: true
---

# MCP Memory & Knowledge Graph

## Overview

Memory MCP servers provide persistent knowledge storage, enabling AI assistants to remember entities, relationships, observations, and context across sessions.

## Architecture

```
┌─────────────────────────────────────┐
│      Memory MCP Server              │
│  ┌───────────────────────────────┐  │
│  │   Memory Manager              │  │
│  │  - Entity CRUD                │  │
│  │  - Relationship mapping       │  │
│  │  - Observation storage        │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   Query Engine                │  │
│  │  - Graph traversal            │  │
│  │  - Semantic search            │  │
│  │  - Context retrieval          │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   Storage Layer               │  │
│  │  - Graph DB / Vector DB       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Core Data Model

```typescript
// src/types.ts
export interface Entity {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, any>;
  createdAt: Date;
}

export interface Observation {
  id: string;
  entityId: string;
  content: string;
  type: "fact" | "opinion" | "event" | "note";
  timestamp: Date;
  source?: string;
  confidence?: number;
}

export interface Context {
  id: string;
  sessionId: string;
  entities: string[];
  relationships: string[];
  observations: string[];
  metadata: Record<string, any>;
  timestamp: Date;
}
```

## Memory Server Implementation

```typescript
// src/memory-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// In-memory storage (use a real database in production)
class MemoryStore {
  private entities = new Map<string, Entity>();
  private relationships = new Map<string, Relationship>();
  private observations = new Map<string, Observation>();
  private contexts = new Map<string, Context>();

  // Entity operations
  createEntity(entity: Omit<Entity, "id" | "createdAt" | "updatedAt">): Entity {
    const newEntity: Entity = {
      ...entity,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.entities.set(newEntity.id, newEntity);
    return newEntity;
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  updateEntity(id: string, updates: Partial<Entity>): Entity | null {
    const entity = this.entities.get(id);
    if (!entity) return null;

    const updated = {
      ...entity,
      ...updates,
      id: entity.id,
      updatedAt: new Date(),
    };
    this.entities.set(id, updated);
    return updated;
  }

  deleteEntity(id: string): boolean {
    return this.entities.delete(id);
  }

  searchEntities(query: {
    type?: string;
    name?: string;
    attributes?: Record<string, any>;
  }): Entity[] {
    return Array.from(this.entities.values()).filter((entity) => {
      if (query.type && entity.type !== query.type) return false;
      if (query.name && !entity.name.toLowerCase().includes(query.name.toLowerCase()))
        return false;
      if (query.attributes) {
        for (const [key, value] of Object.entries(query.attributes)) {
          if (entity.attributes[key] !== value) return false;
        }
      }
      return true;
    });
  }

  // Relationship operations
  createRelationship(
    rel: Omit<Relationship, "id" | "createdAt">
  ): Relationship {
    const newRel: Relationship = {
      ...rel,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.relationships.set(newRel.id, newRel);
    return newRel;
  }

  getRelationshipsForEntity(
    entityId: string,
    direction?: "outgoing" | "incoming"
  ): Relationship[] {
    return Array.from(this.relationships.values()).filter((rel) => {
      if (direction === "outgoing") return rel.sourceId === entityId;
      if (direction === "incoming") return rel.targetId === entityId;
      return rel.sourceId === entityId || rel.targetId === entityId;
    });
  }

  // Observation operations
  createObservation(
    obs: Omit<Observation, "id" | "timestamp">
  ): Observation {
    const newObs: Observation = {
      ...obs,
      id: uuidv4(),
      timestamp: new Date(),
    };
    this.observations.set(newObs.id, newObs);
    return newObs;
  }

  getObservationsForEntity(entityId: string): Observation[] {
    return Array.from(this.observations.values()).filter(
      (obs) => obs.entityId === entityId
    );
  }

  searchObservations(query: string): Observation[] {
    return Array.from(this.observations.values()).filter((obs) =>
      obs.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Context operations
  saveContext(context: Omit<Context, "id" | "timestamp">): Context {
    const newContext: Context = {
      ...context,
      id: uuidv4(),
      timestamp: new Date(),
    };
    this.contexts.set(newContext.id, newContext);
    return newContext;
  }

  getContext(sessionId: string): Context | undefined {
    return Array.from(this.contexts.values()).find(
      (ctx) => ctx.sessionId === sessionId
    );
  }
}

const memoryStore = new MemoryStore();

const server = new Server(
  {
    name: "memory-server",
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
    name: "create_entity",
    description: "Create a new entity in the knowledge graph",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Entity type (person, place, thing, etc.)" },
        name: { type: "string", description: "Entity name" },
        attributes: {
          type: "object",
          description: "Additional attributes",
        },
      },
      required: ["type", "name"],
    },
  },
  {
    name: "get_entity",
    description: "Retrieve an entity by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Entity ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_entity",
    description: "Update an existing entity",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        attributes: { type: "object" },
      },
      required: ["id"],
    },
  },
  {
    name: "search_entities",
    description: "Search for entities",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        name: { type: "string" },
        attributes: { type: "object" },
      },
    },
  },
  {
    name: "create_relationship",
    description: "Create a relationship between entities",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: { type: "string", description: "Source entity ID" },
        targetId: { type: "string", description: "Target entity ID" },
        type: { type: "string", description: "Relationship type" },
        properties: { type: "object" },
      },
      required: ["sourceId", "targetId", "type"],
    },
  },
  {
    name: "get_relationships",
    description: "Get relationships for an entity",
    inputSchema: {
      type: "object",
      properties: {
        entityId: { type: "string" },
        direction: {
          type: "string",
          enum: ["outgoing", "incoming", "both"],
          default: "both",
        },
      },
      required: ["entityId"],
    },
  },
  {
    name: "add_observation",
    description: "Add an observation about an entity",
    inputSchema: {
      type: "object",
      properties: {
        entityId: { type: "string" },
        content: { type: "string" },
        type: {
          type: "string",
          enum: ["fact", "opinion", "event", "note"],
          default: "note",
        },
        source: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["entityId", "content"],
    },
  },
  {
    name: "get_observations",
    description: "Get observations for an entity",
    inputSchema: {
      type: "object",
      properties: {
        entityId: { type: "string" },
      },
      required: ["entityId"],
    },
  },
  {
    name: "search_memory",
    description: "Search across all memory",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_graph",
    description: "Get subgraph starting from an entity",
    inputSchema: {
      type: "object",
      properties: {
        entityId: { type: "string" },
        depth: { type: "number", default: 2, maximum: 5 },
      },
      required: ["entityId"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_entity": {
        const { type, name, attributes = {} } = args as any;
        const entity = memoryStore.createEntity({ type, name, attributes });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(entity, null, 2),
            },
          ],
        };
      }

      case "get_entity": {
        const { id } = args as any;
        const entity = memoryStore.getEntity(id);

        if (!entity) {
          throw new Error(`Entity ${id} not found`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(entity, null, 2),
            },
          ],
        };
      }

      case "update_entity": {
        const { id, ...updates } = args as any;
        const entity = memoryStore.updateEntity(id, updates);

        if (!entity) {
          throw new Error(`Entity ${id} not found`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(entity, null, 2),
            },
          ],
        };
      }

      case "search_entities": {
        const entities = memoryStore.searchEntities(args as any);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(entities, null, 2),
            },
          ],
        };
      }

      case "create_relationship": {
        const { sourceId, targetId, type, properties = {} } = args as any;
        const relationship = memoryStore.createRelationship({
          sourceId,
          targetId,
          type,
          properties,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(relationship, null, 2),
            },
          ],
        };
      }

      case "get_relationships": {
        const { entityId, direction } = args as any;
        const dir = direction === "both" ? undefined : direction;
        const relationships = memoryStore.getRelationshipsForEntity(
          entityId,
          dir
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(relationships, null, 2),
            },
          ],
        };
      }

      case "add_observation": {
        const { entityId, content, type, source, confidence } = args as any;
        const observation = memoryStore.createObservation({
          entityId,
          content,
          type: type || "note",
          source,
          confidence,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(observation, null, 2),
            },
          ],
        };
      }

      case "get_observations": {
        const { entityId } = args as any;
        const observations = memoryStore.getObservationsForEntity(entityId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(observations, null, 2),
            },
          ],
        };
      }

      case "search_memory": {
        const { query } = args as any;
        const observations = memoryStore.searchObservations(query);
        const entities = memoryStore.searchEntities({ name: query });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  entities,
                  observations,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_graph": {
        const { entityId, depth = 2 } = args as any;
        const graph = buildSubgraph(memoryStore, entityId, depth);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(graph, null, 2),
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
          text: `Memory error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Helper to build subgraph
function buildSubgraph(
  store: MemoryStore,
  entityId: string,
  maxDepth: number
): any {
  const visited = new Set<string>();
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];

  function traverse(id: string, depth: number) {
    if (depth > maxDepth || visited.has(id)) return;
    visited.add(id);

    const entity = store.getEntity(id);
    if (!entity) return;

    entities.push(entity);

    const rels = store.getRelationshipsForEntity(id);
    relationships.push(...rels);

    if (depth < maxDepth) {
      for (const rel of rels) {
        const nextId = rel.sourceId === id ? rel.targetId : rel.sourceId;
        traverse(nextId, depth + 1);
      }
    }
  }

  traverse(entityId, 0);

  return { entities, relationships };
}

// Resources: Recent entities
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const entities = memoryStore.searchEntities({});
  const recent = entities.slice(0, 10);

  return {
    resources: recent.map((entity) => ({
      uri: `memory://entity/${entity.id}`,
      name: entity.name,
      description: `${entity.type}: ${entity.name}`,
      mimeType: "application/json",
    })),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (!uri.startsWith("memory://entity/")) {
    throw new Error("Invalid memory resource URI");
  }

  const entityId = uri.slice("memory://entity/".length);
  const entity = memoryStore.getEntity(entityId);

  if (!entity) {
    throw new Error(`Entity ${entityId} not found`);
  }

  const observations = memoryStore.getObservationsForEntity(entityId);
  const relationships = memoryStore.getRelationshipsForEntity(entityId);

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            entity,
            observations,
            relationships,
          },
          null,
          2
        ),
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memory MCP Server running");
}

main();
```

## Vector Database Integration

```typescript
// src/vector-store.ts
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

export class VectorMemoryStore {
  private vectorStore: MemoryVectorStore;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async initialize() {
    this.vectorStore = new MemoryVectorStore(this.embeddings);
  }

  async addMemory(content: string, metadata: Record<string, any>) {
    await this.vectorStore.addDocuments([
      {
        pageContent: content,
        metadata,
      },
    ]);
  }

  async searchSimilar(query: string, k = 5) {
    return await this.vectorStore.similaritySearch(query, k);
  }

  async searchWithScore(query: string, k = 5) {
    return await this.vectorStore.similaritySearchWithScore(query, k);
  }
}
```

## Graph Traversal

```typescript
// src/graph-traversal.ts
export class GraphTraverser {
  constructor(private store: MemoryStore) {}

  findPath(
    startId: string,
    endId: string,
    maxDepth = 5
  ): Entity[] | null {
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: Entity[] }> = [];

    const startEntity = this.store.getEntity(startId);
    if (!startEntity) return null;

    queue.push({ id: startId, path: [startEntity] });

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (id === endId) {
        return path;
      }

      if (path.length >= maxDepth) continue;
      if (visited.has(id)) continue;

      visited.add(id);

      const relationships = this.store.getRelationshipsForEntity(id);

      for (const rel of relationships) {
        const nextId = rel.sourceId === id ? rel.targetId : rel.sourceId;
        const nextEntity = this.store.getEntity(nextId);

        if (nextEntity && !visited.has(nextId)) {
          queue.push({
            id: nextId,
            path: [...path, nextEntity],
          });
        }
      }
    }

    return null;
  }

  findCommonNeighbors(id1: string, id2: string): Entity[] {
    const neighbors1 = this.getNeighbors(id1);
    const neighbors2 = this.getNeighbors(id2);

    const common = neighbors1.filter((e1) =>
      neighbors2.some((e2) => e2.id === e1.id)
    );

    return common;
  }

  private getNeighbors(entityId: string): Entity[] {
    const relationships = this.store.getRelationshipsForEntity(entityId);
    const neighborIds = relationships.map((rel) =>
      rel.sourceId === entityId ? rel.targetId : rel.sourceId
    );

    return neighborIds
      .map((id) => this.store.getEntity(id))
      .filter((e): e is Entity => e !== undefined);
  }

  getCentrality(entityId: string, depth = 2): number {
    const graph = buildSubgraph(this.store, entityId, depth);
    const connections = graph.relationships.filter(
      (r: Relationship) =>
        r.sourceId === entityId || r.targetId === entityId
    );
    return connections.length;
  }
}
```

## Context Management

```typescript
// src/context-manager.ts
export class ContextManager {
  constructor(private store: MemoryStore) {}

  async captureContext(sessionId: string, entities: string[]) {
    // Get all relationships between captured entities
    const relationships: string[] = [];
    const observations: string[] = [];

    for (const entityId of entities) {
      const rels = this.store.getRelationshipsForEntity(entityId);
      relationships.push(...rels.map((r) => r.id));

      const obs = this.store.getObservationsForEntity(entityId);
      observations.push(...obs.map((o) => o.id));
    }

    const context = this.store.saveContext({
      sessionId,
      entities,
      relationships,
      observations,
      metadata: {
        capturedAt: new Date(),
      },
    });

    return context;
  }

  async loadContext(sessionId: string) {
    return this.store.getContext(sessionId);
  }

  async summarizeContext(sessionId: string): Promise<string> {
    const context = this.store.getContext(sessionId);
    if (!context) return "No context found";

    const entities = context.entities
      .map((id) => this.store.getEntity(id))
      .filter((e): e is Entity => e !== undefined);

    const observations = context.observations
      .map((id) => this.store.getObservation(id))
      .filter((o): o is Observation => o !== undefined);

    let summary = `Context for session ${sessionId}:\n\n`;
    summary += `Entities (${entities.length}):\n`;
    entities.forEach((e) => {
      summary += `- ${e.name} (${e.type})\n`;
    });

    summary += `\nKey observations (${observations.length}):\n`;
    observations.slice(0, 5).forEach((o) => {
      summary += `- ${o.content}\n`;
    });

    return summary;
  }
}
```

## Semantic Search

```typescript
// src/semantic-search.ts
export class SemanticSearch {
  constructor(
    private store: MemoryStore,
    private vectorStore: VectorMemoryStore
  ) {}

  async indexEntity(entity: Entity) {
    const content = `${entity.name} is a ${entity.type}. ${JSON.stringify(
      entity.attributes
    )}`;

    await this.vectorStore.addMemory(content, {
      entityId: entity.id,
      type: "entity",
    });
  }

  async indexObservation(observation: Observation) {
    await this.vectorStore.addMemory(observation.content, {
      observationId: observation.id,
      entityId: observation.entityId,
      type: "observation",
    });
  }

  async search(query: string, limit = 10) {
    const results = await this.vectorStore.searchWithScore(query, limit);

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      relevance: score,
    }));
  }

  async findRelatedEntities(entityId: string, limit = 5) {
    const entity = this.store.getEntity(entityId);
    if (!entity) return [];

    const query = `${entity.name} ${entity.type}`;
    const results = await this.search(query, limit + 1);

    // Filter out the original entity
    return results
      .filter((r) => r.metadata.entityId !== entityId)
      .slice(0, limit);
  }
}
```

## Best Practices

1. **Entity Design**: Use clear, consistent entity types
2. **Relationship Types**: Define meaningful relationship semantics
3. **Observation Quality**: Store high-quality, timestamped observations
4. **Context Boundaries**: Define clear session boundaries
5. **Graph Size**: Limit graph depth in traversals
6. **Vector Search**: Use embeddings for semantic similarity
7. **Deduplication**: Avoid duplicate entities and relationships
8. **Timestamps**: Always track when data was created/updated
9. **Confidence Scores**: Track confidence for uncertain information
10. **Privacy**: Implement data retention and deletion policies

## Integration Checklist

- [ ] Entity types defined
- [ ] Relationship types documented
- [ ] Observation categories established
- [ ] Context capture strategy defined
- [ ] Search functionality implemented
- [ ] Graph traversal optimized
- [ ] Vector embeddings configured
- [ ] Data persistence setup
- [ ] Privacy controls implemented
- [ ] Performance monitoring enabled
