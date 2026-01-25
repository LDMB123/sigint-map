---
title: Web Share API
category: Web APIs
tags: [sharing, native-integration, social, chromium143+]
description: Native share functionality for URLs, text, and files
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Web Share API

Enables web apps to trigger the system's native share interface, allowing users to share content with installed apps and contacts.

## When to Use

- **Share articles** — "Share" button in news apps
- **Share files** — Document collaboration apps
- **Social sharing** — Link sharing without hardcoded social buttons
- **Collaborative features** — Share workspaces/projects
- **User-generated content** — Share creations with others
- **Productivity apps** — Send to email, messaging, cloud storage

## Core Concepts

```typescript
interface Navigator {
  share(data?: ShareData): Promise<void>;
  canShare(data?: ShareData): boolean;
}

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}
```

## Basic Sharing

### Share URL and Title

```typescript
async function shareContent(): Promise<void> {
  if (!navigator.share) {
    console.log('Web Share API not available');
    return;
  }

  try {
    await navigator.share({
      title: 'My Awesome Article',
      text: 'Check out this article I found',
      url: window.location.href
    });

    console.log('Content shared successfully');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('User cancelled share');
    } else {
      console.error('Share failed:', error);
    }
  }
}

// Usage
const shareButton = document.querySelector('button.share');
shareButton?.addEventListener('click', shareContent);
```

### Check Before Sharing

```typescript
function canShareContent(data: ShareData): boolean {
  return navigator.canShare?.(data) ?? false;
}

async function smartShare(): Promise<void> {
  const shareData = {
    title: 'Article Title',
    text: 'Article description',
    url: window.location.href
  };

  if (!canShareContent(shareData)) {
    console.log('Share not available for this data');
    // Fallback to manual sharing
    fallbackShare(shareData);
    return;
  }

  await navigator.share?.(shareData);
}

function fallbackShare(data: ShareData): void {
  // Show manual share dialog
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <h2>Share this content</h2>
    <p>${data.title}</p>
    <textarea readonly>${data.text}\n\n${data.url}</textarea>
    <button onclick="this.closest('dialog').close()">Close</button>
  `;
  document.body.appendChild(dialog);
  dialog.showModal();
}
```

## Sharing Different Content Types

### Share Text Only

```typescript
async function shareText(text: string): Promise<void> {
  if (!canShareContent({ text })) return;

  await navigator.share?.({
    text
  });
}

// Usage
await shareText('This is amazing!');
```

### Share URL Only

```typescript
async function shareURL(url: string, title?: string): Promise<void> {
  const data: ShareData = { url };
  if (title) data.title = title;

  if (!canShareContent(data)) return;

  await navigator.share?.(data);
}

// Usage
await shareURL('https://example.com/article', 'Check this out');
```

### Share Files

```typescript
async function shareFiles(files: File[]): Promise<void> {
  const data: ShareData = {
    title: 'Shared Files',
    files
  };

  if (!canShareContent(data)) {
    console.log('File sharing not supported');
    return;
  }

  await navigator.share?.(data);
}

// Usage
const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
if (fileInput?.files) {
  await shareFiles(Array.from(fileInput.files));
}
```

### Share Text with Files

```typescript
async function shareTextWithFiles(
  text: string,
  files: File[]
): Promise<void> {
  const data: ShareData = {
    title: 'Check this out',
    text,
    files
  };

  if (!canShareContent(data)) {
    console.log('This share combination not supported');
    return;
  }

  await navigator.share?.(data);
}

// Usage
const files = await getFilesFromUpload();
await shareTextWithFiles('Here are my files', files);
```

## Real-World Patterns

### Share Button Integration

```typescript
class ShareButton {
  private button: HTMLElement;
  private shareData: ShareData;

  constructor(
    selector: string,
    shareData: ShareData
  ) {
    this.button = document.querySelector(selector) as HTMLElement;
    this.shareData = shareData;

    if (navigator.canShare?.(shareData)) {
      this.setupShare();
    } else {
      this.setupFallback();
    }
  }

  private setupShare(): void {
    this.button.addEventListener('click', async () => {
      try {
        await navigator.share?.(this.shareData);
        console.log('Shared successfully');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Share failed:', error);
        }
      }
    });

    this.button.style.display = 'block';
  }

  private setupFallback(): void {
    this.button.addEventListener('click', () => {
      this.showManualShareDialog();
    });

    this.button.style.display = 'block';
  }

  private showManualShareDialog(): void {
    const url = this.shareData.url || window.location.href;
    const copyText = `${this.shareData.title}\n${this.shareData.text}\n${url}`;

    const dialog = document.createElement('dialog');
    dialog.className = 'share-dialog';
    dialog.innerHTML = `
      <h2>Share</h2>
      <div class="share-options">
        <button class="copy-link">Copy Link</button>
        <button class="share-email">Share via Email</button>
      </div>
      <button class="close">Close</button>
    `;

    dialog.querySelector('.copy-link')?.addEventListener('click', () => {
      navigator.clipboard.writeText(url);
      dialog.close();
    });

    dialog.querySelector('.share-email')?.addEventListener('click', () => {
      window.location.href = `mailto:?subject=${encodeURIComponent(this.shareData.title || '')}&body=${encodeURIComponent(copyText)}`;
      dialog.close();
    });

    dialog.querySelector('.close')?.addEventListener('click', () => {
      dialog.close();
    });

    document.body.appendChild(dialog);
    dialog.showModal();
  }
}

// Usage
new ShareButton('button.share', {
  title: 'Article Title',
  text: 'Check out this article',
  url: window.location.href
});
```

### Article Share Widget

```typescript
class ArticleShareWidget {
  private container: HTMLElement;
  private article: {
    title: string;
    excerpt: string;
    url: string;
  };

  constructor(
    containerId: string,
    article: ArticleShareWidget['article']
  ) {
    this.container = document.getElementById(containerId) as HTMLElement;
    this.article = article;
    this.render();
  }

  private render(): void {
    const widget = document.createElement('div');
    widget.className = 'article-share-widget';

    if (navigator.share) {
      widget.innerHTML = `
        <button class="share-btn">
          <span>Share Article</span>
        </button>
      `;

      widget.querySelector('.share-btn')?.addEventListener('click', () => {
        this.share();
      });
    } else {
      widget.innerHTML = `
        <div class="share-links">
          <a class="share-link" href="${this.getTwitterShareURL()}" target="_blank">Twitter</a>
          <a class="share-link" href="${this.getFacebookShareURL()}" target="_blank">Facebook</a>
          <a class="share-link" href="${this.getLinkedInShareURL()}" target="_blank">LinkedIn</a>
        </div>
      `;
    }

    this.container.appendChild(widget);
  }

  private async share(): Promise<void> {
    try {
      await navigator.share?.({
        title: this.article.title,
        text: this.article.excerpt,
        url: this.article.url
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }

  private getTwitterShareURL(): string {
    const text = encodeURIComponent(`${this.article.title} ${this.article.url}`);
    return `https://twitter.com/intent/tweet?text=${text}`;
  }

  private getFacebookShareURL(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.article.url)}`;
  }

  private getLinkedInShareURL(): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.article.url)}`;
  }
}

// Usage
new ArticleShareWidget('share-widget', {
  title: 'Understanding Web APIs',
  excerpt: 'Learn about modern web platform capabilities',
  url: window.location.href
});
```

### Share with Tracking

```typescript
class TrackableShare {
  async shareWithTracking(
    data: ShareData,
    trackingId: string
  ): Promise<void> {
    if (!navigator.share) {
      console.log('Share not available');
      return;
    }

    try {
      // Track share attempt
      await this.trackEvent('share_initiated', { trackingId });

      await navigator.share?.(data);

      // Track successful share
      await this.trackEvent('share_completed', { trackingId });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        await this.trackEvent('share_cancelled', { trackingId });
      } else {
        await this.trackEvent('share_error', {
          trackingId,
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }
    }
  }

  private async trackEvent(
    event: string,
    data: Record<string, any>
  ): Promise<void> {
    // Send to analytics
    console.log(`Tracked: ${event}`, data);
  }
}

// Usage
const sharer = new TrackableShare();
await sharer.shareWithTracking(
  {
    title: 'Great article',
    url: 'https://example.com/article',
    text: 'Read this amazing article'
  },
  'article-123'
);
```

### Share Document with Files

```typescript
class DocumentShare {
  async shareDocument(
    title: string,
    content: string,
    fileName: string
  ): Promise<void> {
    // Create blob from content
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });

    const shareData: ShareData = {
      title: `Document: ${title}`,
      text: `Check out my document: ${title}`,
      files: [file]
    };

    if (!navigator.canShare?.(shareData)) {
      console.log('File sharing not available');
      return;
    }

    await navigator.share?.(shareData);
  }

  async shareMultipleFiles(
    title: string,
    files: File[]
  ): Promise<void> {
    const shareData: ShareData = {
      title,
      text: `Sharing ${files.length} files`,
      files
    };

    if (!navigator.canShare?.(shareData)) {
      console.log('Multi-file sharing not available');
      return;
    }

    await navigator.share?.(shareData);
  }
}

// Usage
const docShare = new DocumentShare();
await docShare.shareDocument(
  'My Report',
  'Content of the report...',
  'report.txt'
);
```

## Error Handling

```typescript
async function robustShare(data: ShareData): Promise<void> {
  // Check API existence
  if (!navigator.share) {
    console.log('Web Share API not available');
    showFallbackShare(data);
    return;
  }

  // Check if data can be shared
  if (!navigator.canShare?.(data)) {
    console.log('This share combination not supported');
    showFallbackShare(data);
    return;
  }

  try {
    await navigator.share(data);
    console.log('Shared successfully');
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'AbortError':
          console.log('User cancelled share');
          break;
        case 'NotAllowedError':
          console.log('Share not allowed (HTTPS required?)');
          break;
        case 'InvalidStateError':
          console.log('Invalid share state');
          break;
        default:
          console.error('Share failed:', error.message);
      }
    }
  }
}

function showFallbackShare(data: ShareData): void {
  // Implement fallback sharing UI
}
```

## Browser Support

**Chromium 143+ baseline** — Web Share API is fully supported for URLs, text, and files. File sharing support varies by platform.

**Platform Support:**
- macOS: Share to Mail, Messages, AirDrop, social apps
- Android: All installed apps supporting share intent
- Windows: Minimal support, primarily clipboard

## Related APIs

- **Clipboard API** — Copy content programmatically
- **Fetch API** — Download files before sharing
- **Permissions API** — Request share permissions explicitly
- **File System Access API** — Access files to share
