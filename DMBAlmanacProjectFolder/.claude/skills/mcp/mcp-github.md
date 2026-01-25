---
name: mcp-github
description: GitHub integration via MCP for repository operations, issues, PRs, and code search
version: 1.0.0
mcp-version: "1.0"
sdk: typescript
partner-ready: true
---

# MCP GitHub Integration

## Overview

GitHub MCP servers provide programmatic access to GitHub features including repositories, issues, pull requests, code search, and GitHub Actions.

## Architecture

```
┌─────────────────────────────────────┐
│      GitHub MCP Server              │
│  ┌───────────────────────────────┐  │
│  │   Authentication Layer        │  │
│  │  - Personal Access Token      │  │
│  │  - OAuth App                  │  │
│  │  - GitHub App                 │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │    GitHub Operations          │  │
│  │  - Repos  - PRs   - Actions   │  │
│  │  - Issues - Code  - Webhooks  │  │
│  └───────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │ REST/GraphQL API
┌─────────────────▼───────────────────┐
│          GitHub API                 │
└─────────────────────────────────────┘
```

## Basic GitHub Server Setup

```typescript
// src/github-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

// Initialize Octokit
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const server = new Server(
  {
    name: "github-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: "get_repository",
    description: "Get information about a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "list_issues",
    description: "List issues in a repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          default: "open",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Filter by labels",
        },
        per_page: {
          type: "number",
          default: 30,
          maximum: 100,
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "create_issue",
    description: "Create a new issue",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
        assignees: { type: "array", items: { type: "string" } },
      },
      required: ["owner", "repo", "title"],
    },
  },
  {
    name: "list_pull_requests",
    description: "List pull requests in a repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          default: "open",
        },
        per_page: { type: "number", default: 30 },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "create_pull_request",
    description: "Create a new pull request",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        head: { type: "string", description: "Branch to merge from" },
        base: { type: "string", description: "Branch to merge into" },
        draft: { type: "boolean", default: false },
      },
      required: ["owner", "repo", "title", "head", "base"],
    },
  },
  {
    name: "search_code",
    description: "Search code across GitHub",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        per_page: { type: "number", default: 30 },
      },
      required: ["q"],
    },
  },
  {
    name: "get_file_contents",
    description: "Get contents of a file from a repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "File path" },
        ref: { type: "string", description: "Branch or commit SHA" },
      },
      required: ["owner", "repo", "path"],
    },
  },
  {
    name: "create_or_update_file",
    description: "Create or update a file in a repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string" },
        message: { type: "string", description: "Commit message" },
        content: { type: "string", description: "File content (base64)" },
        branch: { type: "string", default: "main" },
        sha: { type: "string", description: "SHA of file being updated" },
      },
      required: ["owner", "repo", "path", "message", "content"],
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
      case "get_repository": {
        const { owner, repo } = args as { owner: string; repo: string };
        const response = await octokit.repos.get({ owner, repo });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "list_issues": {
        const { owner, repo, state, labels, per_page } = args as any;
        const response = await octokit.issues.listForRepo({
          owner,
          repo,
          state: state || "open",
          labels: labels?.join(","),
          per_page: per_page || 30,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "create_issue": {
        const { owner, repo, title, body, labels, assignees } = args as any;
        const response = await octokit.issues.create({
          owner,
          repo,
          title,
          body,
          labels,
          assignees,
        });

        return {
          content: [
            {
              type: "text",
              text: `Created issue #${response.data.number}: ${response.data.html_url}`,
            },
          ],
        };
      }

      case "list_pull_requests": {
        const { owner, repo, state, per_page } = args as any;
        const response = await octokit.pulls.list({
          owner,
          repo,
          state: state || "open",
          per_page: per_page || 30,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "create_pull_request": {
        const { owner, repo, title, body, head, base, draft } = args as any;
        const response = await octokit.pulls.create({
          owner,
          repo,
          title,
          body,
          head,
          base,
          draft,
        });

        return {
          content: [
            {
              type: "text",
              text: `Created PR #${response.data.number}: ${response.data.html_url}`,
            },
          ],
        };
      }

      case "search_code": {
        const { q, per_page } = args as any;
        const response = await octokit.search.code({
          q,
          per_page: per_page || 30,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "get_file_contents": {
        const { owner, repo, path, ref } = args as any;
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref,
        });

        // Decode base64 content
        const content = Buffer.from(
          (response.data as any).content,
          "base64"
        ).toString("utf-8");

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "create_or_update_file": {
        const { owner, repo, path, message, content, branch, sha } =
          args as any;

        const response = await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString("base64"),
          branch,
          sha,
        });

        return {
          content: [
            {
              type: "text",
              text: `File ${path} updated: ${response.data.commit.html_url}`,
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
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Resources: Recent repositories
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 10,
    });

    return {
      resources: data.map((repo) => ({
        uri: `github://repo/${repo.full_name}`,
        name: repo.full_name,
        description: repo.description || "No description",
        mimeType: "application/json",
      })),
    };
  } catch (error) {
    return { resources: [] };
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (!uri.startsWith("github://repo/")) {
    throw new Error("Invalid GitHub resource URI");
  }

  const repoPath = uri.slice("github://repo/".length);
  const [owner, repo] = repoPath.split("/");

  const { data } = await octokit.repos.get({ owner, repo });

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub MCP Server running");
}

main();
```

## Advanced GitHub Operations

### Pull Request Workflows

```typescript
// src/pr-workflows.ts
import { Octokit } from "@octokit/rest";

export class PRWorkflows {
  constructor(private octokit: Octokit) {}

  async reviewPR(
    owner: string,
    repo: string,
    pull_number: number,
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
    body?: string
  ) {
    return await this.octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      event,
      body,
    });
  }

  async mergePR(
    owner: string,
    repo: string,
    pull_number: number,
    merge_method: "merge" | "squash" | "rebase" = "merge"
  ) {
    // Check if PR is mergeable
    const { data: pr } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number,
    });

    if (!pr.mergeable) {
      throw new Error("PR is not mergeable");
    }

    // Merge the PR
    return await this.octokit.pulls.merge({
      owner,
      repo,
      pull_number,
      merge_method,
    });
  }

  async requestReviewers(
    owner: string,
    repo: string,
    pull_number: number,
    reviewers: string[],
    team_reviewers?: string[]
  ) {
    return await this.octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number,
      reviewers,
      team_reviewers,
    });
  }

  async addLabels(
    owner: string,
    repo: string,
    issue_number: number,
    labels: string[]
  ) {
    return await this.octokit.issues.addLabels({
      owner,
      repo,
      issue_number,
      labels,
    });
  }

  async getCheckRuns(
    owner: string,
    repo: string,
    ref: string
  ) {
    return await this.octokit.checks.listForRef({
      owner,
      repo,
      ref,
    });
  }
}
```

### Issue Management

```typescript
// src/issue-management.ts
export class IssueManagement {
  constructor(private octokit: Octokit) {}

  async createIssueFromTemplate(
    owner: string,
    repo: string,
    templateData: {
      title: string;
      type: "bug" | "feature" | "question";
      description: string;
      stepsToReproduce?: string[];
      expectedBehavior?: string;
      actualBehavior?: string;
    }
  ) {
    const body = this.formatIssueBody(templateData);
    const labels = this.getLabelsForType(templateData.type);

    return await this.octokit.issues.create({
      owner,
      repo,
      title: templateData.title,
      body,
      labels,
    });
  }

  private formatIssueBody(data: any): string {
    let body = `## Description\n\n${data.description}\n\n`;

    if (data.stepsToReproduce) {
      body += `## Steps to Reproduce\n\n`;
      data.stepsToReproduce.forEach((step: string, i: number) => {
        body += `${i + 1}. ${step}\n`;
      });
      body += "\n";
    }

    if (data.expectedBehavior) {
      body += `## Expected Behavior\n\n${data.expectedBehavior}\n\n`;
    }

    if (data.actualBehavior) {
      body += `## Actual Behavior\n\n${data.actualBehavior}\n\n`;
    }

    return body;
  }

  private getLabelsForType(type: string): string[] {
    const labelMap: Record<string, string[]> = {
      bug: ["bug", "needs-triage"],
      feature: ["enhancement", "needs-discussion"],
      question: ["question"],
    };
    return labelMap[type] || [];
  }

  async closeIssueWithComment(
    owner: string,
    repo: string,
    issue_number: number,
    reason: string
  ) {
    // Add comment
    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number,
      body: reason,
    });

    // Close issue
    return await this.octokit.issues.update({
      owner,
      repo,
      issue_number,
      state: "closed",
    });
  }
}
```

### Code Search with Filters

```typescript
// src/code-search.ts
export class CodeSearch {
  constructor(private octokit: Octokit) {}

  async searchInOrganization(
    org: string,
    query: string,
    options?: {
      language?: string;
      extension?: string;
      path?: string;
    }
  ) {
    let q = `org:${org} ${query}`;

    if (options?.language) {
      q += ` language:${options.language}`;
    }
    if (options?.extension) {
      q += ` extension:${options.extension}`;
    }
    if (options?.path) {
      q += ` path:${options.path}`;
    }

    const { data } = await this.octokit.search.code({ q });
    return data.items;
  }

  async searchAcrossRepos(
    repos: Array<{ owner: string; repo: string }>,
    query: string
  ) {
    const results = [];

    for (const { owner, repo } of repos) {
      const q = `repo:${owner}/${repo} ${query}`;
      try {
        const { data } = await this.octokit.search.code({ q });
        results.push(...data.items);
      } catch (error) {
        console.error(`Error searching ${owner}/${repo}:`, error);
      }
    }

    return results;
  }

  async findSecurityVulnerabilities(
    owner: string,
    repo: string
  ) {
    const patterns = [
      "password",
      "api_key",
      "secret",
      "token",
      "credentials",
      "private_key",
    ];

    const results = [];

    for (const pattern of patterns) {
      const q = `repo:${owner}/${repo} ${pattern}`;
      try {
        const { data } = await this.octokit.search.code({ q });
        results.push({
          pattern,
          matches: data.items,
        });
      } catch (error) {
        console.error(`Error searching for ${pattern}:`, error);
      }
    }

    return results;
  }
}
```

### GitHub Actions Integration

```typescript
// src/actions-integration.ts
export class ActionsIntegration {
  constructor(private octokit: Octokit) {}

  async listWorkflowRuns(
    owner: string,
    repo: string,
    workflow_id?: number,
    status?: "queued" | "in_progress" | "completed"
  ) {
    const params: any = { owner, repo };
    if (workflow_id) params.workflow_id = workflow_id;
    if (status) params.status = status;

    return await this.octokit.actions.listWorkflowRunsForRepo(params);
  }

  async triggerWorkflow(
    owner: string,
    repo: string,
    workflow_id: string,
    ref: string,
    inputs?: Record<string, any>
  ) {
    return await this.octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id,
      ref,
      inputs,
    });
  }

  async getWorkflowRunLogs(
    owner: string,
    repo: string,
    run_id: number
  ) {
    return await this.octokit.actions.downloadWorkflowRunLogs({
      owner,
      repo,
      run_id,
    });
  }

  async cancelWorkflowRun(
    owner: string,
    repo: string,
    run_id: number
  ) {
    return await this.octokit.actions.cancelWorkflowRun({
      owner,
      repo,
      run_id,
    });
  }

  async listSecrets(owner: string, repo: string) {
    return await this.octokit.actions.listRepoSecrets({
      owner,
      repo,
    });
  }

  async createOrUpdateSecret(
    owner: string,
    repo: string,
    secret_name: string,
    encrypted_value: string
  ) {
    return await this.octokit.actions.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name,
      encrypted_value,
    });
  }
}
```

### Webhook Handling

```typescript
// src/webhook-handler.ts
import { createHmac } from "crypto";
import express from "express";

export class WebhookHandler {
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  verifySignature(payload: string, signature: string): boolean {
    const hmac = createHmac("sha256", this.webhookSecret);
    const digest = "sha256=" + hmac.update(payload).digest("hex");
    return digest === signature;
  }

  setupWebhookEndpoint() {
    const app = express();

    app.post(
      "/webhook",
      express.json({ verify: this.rawBodySaver }),
      async (req, res) => {
        const signature = req.headers["x-hub-signature-256"] as string;

        if (!this.verifySignature((req as any).rawBody, signature)) {
          return res.status(401).send("Invalid signature");
        }

        const event = req.headers["x-github-event"] as string;

        try {
          await this.handleEvent(event, req.body);
          res.status(200).send("OK");
        } catch (error) {
          console.error("Webhook error:", error);
          res.status(500).send("Internal error");
        }
      }
    );

    return app;
  }

  private rawBodySaver(
    req: express.Request,
    res: express.Response,
    buf: Buffer,
    encoding: string
  ) {
    if (buf && buf.length) {
      (req as any).rawBody = buf.toString(encoding || "utf8");
    }
  }

  private async handleEvent(event: string, payload: any) {
    switch (event) {
      case "push":
        console.log(`Push to ${payload.repository.full_name}`);
        break;
      case "pull_request":
        console.log(`PR ${payload.action}: #${payload.pull_request.number}`);
        break;
      case "issues":
        console.log(`Issue ${payload.action}: #${payload.issue.number}`);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
  }
}
```

## GraphQL API Integration

```typescript
// src/graphql-client.ts
import { graphql } from "@octokit/graphql";

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

export async function getRepositoryDetails(owner: string, name: string) {
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        name
        description
        stargazerCount
        forkCount
        primaryLanguage {
          name
        }
        issues(states: OPEN) {
          totalCount
        }
        pullRequests(states: OPEN) {
          totalCount
        }
        defaultBranchRef {
          name
          target {
            ... on Commit {
              history(first: 10) {
                nodes {
                  message
                  committedDate
                  author {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  return await graphqlWithAuth(query, { owner, name });
}

export async function searchRepositories(query: string, first = 10) {
  const gql = `
    query($query: String!, $first: Int!) {
      search(query: $query, type: REPOSITORY, first: $first) {
        repositoryCount
        nodes {
          ... on Repository {
            name
            owner {
              login
            }
            description
            stargazerCount
            url
          }
        }
      }
    }
  `;

  return await graphqlWithAuth(gql, { query, first });
}
```

## Rate Limiting

```typescript
// src/rate-limiter.ts
export class GitHubRateLimiter {
  constructor(private octokit: Octokit) {}

  async checkRateLimit() {
    const { data } = await this.octokit.rateLimit.get();
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
      used: data.rate.used,
    };
  }

  async waitForRateLimit() {
    const rateLimit = await this.checkRateLimit();

    if (rateLimit.remaining === 0) {
      const waitTime = rateLimit.reset.getTime() - Date.now();
      console.log(`Rate limit exceeded. Waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForRateLimit();
    return await fn();
  }
}
```

## Best Practices

1. **Authentication**: Use fine-grained personal access tokens
2. **Rate Limiting**: Respect GitHub's rate limits
3. **Error Handling**: Handle API errors gracefully
4. **Pagination**: Implement proper pagination for large result sets
5. **Caching**: Cache responses when appropriate
6. **Webhooks**: Verify webhook signatures
7. **GraphQL**: Use GraphQL for complex queries to reduce API calls
8. **Permissions**: Request minimal required permissions
9. **Logging**: Log all API operations for debugging
10. **Testing**: Mock GitHub API in tests

## Security Checklist

- [ ] GitHub token stored securely in environment
- [ ] Token has minimal required permissions
- [ ] Webhook signatures verified
- [ ] Rate limiting implemented
- [ ] Sensitive data not logged
- [ ] Input validation on all parameters
- [ ] Error messages don't leak tokens
- [ ] HTTPS enforced for webhooks
- [ ] Regular token rotation
- [ ] Audit logs maintained
