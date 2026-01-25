---
description: Integration patterns for Google Cloud Platform and Google Workspace APIs including OAuth, Gemini AI, Drive, and Sheets
tags: [google, gcp, oauth, gemini, drive, sheets, api, authentication]
globs: ["**/google/**/*.ts", "**/auth/google*.ts"]
---

# Google APIs Integration

## OAuth 2.0 Authentication

### Service Account Authentication (Server-to-Server)

```typescript
import { google } from 'googleapis';
import { readFile } from 'fs/promises';

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

class GoogleServiceAccountAuth {
  private auth: any;

  async initialize(keyFilePath: string, scopes: string[]) {
    const credentials: ServiceAccountCredentials = JSON.parse(
      await readFile(keyFilePath, 'utf-8')
    );

    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes,
    });

    return this.auth;
  }

  async getAccessToken(): Promise<string> {
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error('Failed to obtain access token');
    }

    return tokenResponse.token;
  }

  getAuthClient() {
    return this.auth;
  }
}

// Usage example
const auth = new GoogleServiceAccountAuth();
await auth.initialize('./service-account.json', [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
]);
```

### OAuth 2.0 User Authentication (3-Legged)

```typescript
import { google } from 'googleapis';

interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

class GoogleOAuth2Client {
  private oauth2Client: any;

  constructor(config: OAuth2Config) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  getAuthUrl(scopes: string[], state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: scopes,
      state: state || crypto.randomUUID(),
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  async exchangeCodeForTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date,
    };
  }

  setCredentials(tokens: { access_token: string; refresh_token?: string }) {
    this.oauth2Client.setCredentials(tokens);
  }

  getClient() {
    return this.oauth2Client;
  }
}

// Express.js route example
app.get('/auth/google', (req, res) => {
  const oauth = new GoogleOAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${process.env.BASE_URL}/auth/google/callback`,
  });

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.file',
  ];

  const authUrl = oauth.getAuthUrl(scopes);
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  const oauth = new GoogleOAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${process.env.BASE_URL}/auth/google/callback`,
  });

  try {
    const tokens = await oauth.exchangeCodeForTokens(code as string);

    // Store tokens securely (encrypted in database)
    await storeUserTokens(req.session.userId, tokens);

    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/auth/error');
  }
});
```

## Gemini API Integration

### Basic Text Generation

```typescript
interface GeminiConfig {
  apiKey: string;
  model?: string;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

class GeminiClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-pro';
  }

  async generateContent(prompt: string, options?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  }): Promise<string> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxOutputTokens ?? 2048,
          topP: options?.topP ?? 0.95,
          topK: options?.topK ?? 40,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    return data.candidates[0]?.content.parts[0]?.text || '';
  }

  async chat(messages: GeminiMessage[], options?: {
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<{ response: string; usage?: any }> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(msg => ({
          role: msg.role,
          parts: msg.parts,
        })),
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxOutputTokens ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data: GeminiResponse = await response.json();

    return {
      response: data.candidates[0]?.content.parts[0]?.text || '',
      usage: data.usageMetadata,
    };
  }

  async *streamGenerateContent(prompt: string): AsyncGenerator<string> {
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini streaming error: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const jsonStr = line.replace('data: ', '');
        try {
          const data = JSON.parse(jsonStr);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

// Usage
const gemini = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY! });

// Simple generation
const response = await gemini.generateContent('Explain quantum computing in simple terms');

// Chat conversation
const chatResponse = await gemini.chat([
  { role: 'user', parts: [{ text: 'Hello! What is TypeScript?' }] },
  { role: 'model', parts: [{ text: 'TypeScript is a typed superset of JavaScript...' }] },
  { role: 'user', parts: [{ text: 'Can you show me an example?' }] },
]);

// Streaming
for await (const chunk of gemini.streamGenerateContent('Write a story about AI')) {
  process.stdout.write(chunk);
}
```

## Google Drive API

```typescript
import { google, drive_v3 } from 'googleapis';

class GoogleDriveClient {
  private drive: drive_v3.Drive;

  constructor(authClient: any) {
    this.drive = google.drive({ version: 'v3', auth: authClient });
  }

  async listFiles(options?: {
    query?: string;
    pageSize?: number;
    pageToken?: string;
    orderBy?: string;
  }) {
    const response = await this.drive.files.list({
      q: options?.query,
      pageSize: options?.pageSize || 100,
      pageToken: options?.pageToken,
      orderBy: options?.orderBy || 'modifiedTime desc',
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
    });

    return {
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  async uploadFile(options: {
    fileName: string;
    mimeType: string;
    fileContent: Buffer | string;
    folderId?: string;
  }) {
    const fileMetadata: any = {
      name: options.fileName,
    };

    if (options.folderId) {
      fileMetadata.parents = [options.folderId];
    }

    const media = {
      mimeType: options.mimeType,
      body: options.fileContent,
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    return response.data;
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const response = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  }

  async createFolder(folderName: string, parentFolderId?: string) {
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
    });

    return response.data;
  }

  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' | 'commenter') {
    await this.drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role,
        emailAddress: email,
      },
      sendNotificationEmail: true,
    });
  }

  async deleteFile(fileId: string) {
    await this.drive.files.delete({ fileId });
  }

  async searchFiles(query: string) {
    // Example queries:
    // - name contains 'report'
    // - mimeType = 'application/pdf'
    // - '1234567890' in parents (files in specific folder)
    // - modifiedTime > '2024-01-01T00:00:00'
    // - trashed = false

    return this.listFiles({
      query: `${query} and trashed = false`,
      orderBy: 'modifiedTime desc',
    });
  }
}

// Usage
const auth = new GoogleOAuth2Client({ /* config */ });
const drive = new GoogleDriveClient(auth.getClient());

// Upload file
const file = await drive.uploadFile({
  fileName: 'report.pdf',
  mimeType: 'application/pdf',
  fileContent: Buffer.from(pdfData),
});

// Search and download
const results = await drive.searchFiles("name contains 'invoice' and mimeType = 'application/pdf'");
if (results.files.length > 0) {
  const content = await drive.downloadFile(results.files[0].id!);
}
```

## Google Sheets API

```typescript
import { google, sheets_v4 } from 'googleapis';

class GoogleSheetsClient {
  private sheets: sheets_v4.Sheets;

  constructor(authClient: any) {
    this.sheets = google.sheets({ version: 'v4', auth: authClient });
  }

  async readSheet(spreadsheetId: string, range: string) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  }

  async writeSheet(spreadsheetId: string, range: string, values: any[][]) {
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED', // Parse formulas, dates, etc.
      requestBody: { values },
    });

    return response.data;
  }

  async appendRows(spreadsheetId: string, range: string, values: any[][]) {
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });

    return response.data;
  }

  async batchUpdate(spreadsheetId: string, requests: any[]) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    return response.data;
  }

  async createSpreadsheet(title: string, sheetTitles: string[] = ['Sheet1']) {
    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: sheetTitles.map(title => ({
          properties: { title },
        })),
      },
    });

    return {
      spreadsheetId: response.data.spreadsheetId!,
      spreadsheetUrl: response.data.spreadsheetUrl!,
    };
  }

  async formatSheet(spreadsheetId: string, sheetId: number, options: {
    bold?: boolean;
    backgroundColor?: { red: number; green: number; blue: number };
    range?: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number };
  }) {
    const requests: any[] = [];

    if (options.bold !== undefined) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            ...options.range,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: options.bold },
            },
          },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      });
    }

    if (options.backgroundColor) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            ...options.range,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: options.backgroundColor,
            },
          },
          fields: 'userEnteredFormat.backgroundColor',
        },
      });
    }

    return this.batchUpdate(spreadsheetId, requests);
  }
}

// Usage example: Create analytics report
async function createAnalyticsReport(data: any[]) {
  const auth = new GoogleServiceAccountAuth();
  await auth.initialize('./service-account.json', [
    'https://www.googleapis.com/auth/spreadsheets',
  ]);

  const sheets = new GoogleSheetsClient(auth.getAuthClient());

  // Create new spreadsheet
  const { spreadsheetId } = await sheets.createSpreadsheet('Analytics Report', ['Data', 'Summary']);

  // Write data
  await sheets.writeSheet(spreadsheetId, 'Data!A1:Z', [
    ['Date', 'Users', 'Sessions', 'Revenue'],
    ...data.map(row => [row.date, row.users, row.sessions, row.revenue]),
  ]);

  // Format header row
  await sheets.formatSheet(spreadsheetId, 0, {
    bold: true,
    backgroundColor: { red: 0.2, green: 0.2, blue: 0.8 },
    range: { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
  });

  return spreadsheetId;
}
```

## Rate Limiting and Quotas

```typescript
interface RateLimiter {
  requestsPerSecond: number;
  requestsPerDay: number;
  currentSecondCount: number;
  currentDayCount: number;
  lastSecondReset: number;
  lastDayReset: number;
}

class GoogleAPIRateLimiter {
  private limiters = new Map<string, RateLimiter>();

  constructor(private defaultRPS: number = 10, private defaultRPD: number = 10000) {}

  async waitForSlot(apiName: string): Promise<void> {
    if (!this.limiters.has(apiName)) {
      this.limiters.set(apiName, {
        requestsPerSecond: this.defaultRPS,
        requestsPerDay: this.defaultRPD,
        currentSecondCount: 0,
        currentDayCount: 0,
        lastSecondReset: Date.now(),
        lastDayReset: Date.now(),
      });
    }

    const limiter = this.limiters.get(apiName)!;
    const now = Date.now();

    // Reset counters if needed
    if (now - limiter.lastSecondReset >= 1000) {
      limiter.currentSecondCount = 0;
      limiter.lastSecondReset = now;
    }

    if (now - limiter.lastDayReset >= 86400000) {
      limiter.currentDayCount = 0;
      limiter.lastDayReset = now;
    }

    // Check if we need to wait
    if (limiter.currentSecondCount >= limiter.requestsPerSecond) {
      const waitTime = 1000 - (now - limiter.lastSecondReset);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      limiter.currentSecondCount = 0;
      limiter.lastSecondReset = Date.now();
    }

    if (limiter.currentDayCount >= limiter.requestsPerDay) {
      throw new Error(`Daily quota exceeded for ${apiName}`);
    }

    limiter.currentSecondCount++;
    limiter.currentDayCount++;
  }

  async executeWithLimit<T>(apiName: string, fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot(apiName);
    return fn();
  }
}

// Usage with exponential backoff
class GoogleAPIClient {
  private rateLimiter = new GoogleAPIRateLimiter(10, 10000);

  async callAPI<T>(apiName: string, fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.rateLimiter.executeWithLimit(apiName, fn);
      } catch (error: any) {
        if (error.code === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
          if (attempt === maxRetries) throw error;

          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }
}
```

## Error Handling Patterns

```typescript
interface GoogleAPIError {
  code: number;
  message: string;
  status: string;
  details?: any[];
}

class GoogleAPIErrorHandler {
  static isRetryable(error: any): boolean {
    const retryableCodes = [429, 500, 502, 503, 504];
    const retryableStatuses = ['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED'];

    return (
      retryableCodes.includes(error.code) ||
      retryableStatuses.includes(error.status)
    );
  }

  static async handleError(error: any, context: string): Promise<never> {
    const apiError = error.response?.data?.error || error;

    const errorDetails = {
      context,
      code: apiError.code,
      message: apiError.message,
      status: apiError.status,
      timestamp: new Date().toISOString(),
    };

    // Log to monitoring system
    console.error('Google API Error:', errorDetails);

    // User-friendly error messages
    switch (apiError.code) {
      case 401:
        throw new Error('Authentication failed. Please sign in again.');
      case 403:
        throw new Error('Permission denied. Check API scopes and credentials.');
      case 404:
        throw new Error('Resource not found.');
      case 429:
        throw new Error('Rate limit exceeded. Please try again later.');
      case 500:
      case 502:
      case 503:
      case 504:
        throw new Error('Google service temporarily unavailable. Please try again.');
      default:
        throw new Error(`API error: ${apiError.message}`);
    }
  }

  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelayMs?: number;
      maxDelayMs?: number;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const initialDelayMs = options.initialDelayMs ?? 1000;
    const maxDelayMs = options.maxDelayMs ?? 10000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        if (!this.isRetryable(error) || attempt === maxRetries) {
          throw error;
        }

        const delayMs = Math.min(
          initialDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );

        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

// Complete usage example
async function syncUserDataToSheets(userId: string) {
  const auth = new GoogleServiceAccountAuth();
  await auth.initialize('./service-account.json', [
    'https://www.googleapis.com/auth/spreadsheets',
  ]);

  const sheets = new GoogleSheetsClient(auth.getAuthClient());
  const apiClient = new GoogleAPIClient();

  try {
    const userData = await getUserData(userId);

    await GoogleAPIErrorHandler.withRetry(
      () => apiClient.callAPI('sheets', () =>
        sheets.appendRows(
          process.env.SPREADSHEET_ID!,
          'Users!A:E',
          [[userData.id, userData.name, userData.email, userData.signupDate, userData.plan]]
        )
      ),
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    return { success: true };
  } catch (error) {
    return GoogleAPIErrorHandler.handleError(error, `syncUserDataToSheets(${userId})`);
  }
}
```

## Best Practices

1. **Authentication**
   - Use service accounts for server-to-server
   - Request minimal scopes needed
   - Store refresh tokens securely (encrypted)
   - Handle token expiration gracefully

2. **Rate Limiting**
   - Implement exponential backoff
   - Respect quota limits
   - Use batch operations when possible
   - Cache responses when appropriate

3. **Error Handling**
   - Retry transient errors (429, 5xx)
   - Log errors with context
   - Provide user-friendly messages
   - Monitor quota usage

4. **Security**
   - Never commit credentials
   - Use environment variables
   - Rotate service account keys regularly
   - Implement proper access controls

5. **Performance**
   - Use batch APIs for bulk operations
   - Paginate large result sets
   - Implement caching for static data
   - Use partial responses (fields parameter)
