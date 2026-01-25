---
title: Document Picture-in-Picture API
description: Custom PiP UIs beyond video - for any HTML content
tags: [chromium-143, api, picture-in-picture, ui, windows]
min_chrome_version: 119
category: Window APIs
complexity: advanced
last_updated: 2026-01
---

# Document Picture-in-Picture API (Chrome 119+)

Open custom HTML UIs in floating, always-on-top windows. Not limited to video - render any DOM content, dashboards, controls, or monitoring tools in a Picture-in-Picture window.

## When to Use

- **Video controls** - Custom player UI outside main video
- **Dashboard monitoring** - Live metrics window while viewing content
- **Floating chat** - Chat interface in PiP while browsing
- **Controls panel** - Tools window independent of main content
- **Screen capture UI** - Recording controls while sharing
- **Teleprompter** - Speaker notes in separate window
- **Reference materials** - Docs/notes alongside editor

## Syntax

```typescript
// Request Picture-in-Picture window
const pipWindow = await documentPictureInPicture.requestWindow({
  width: 320,
  height: 180,
  disallowReturnToOpener: false  // Allow return to main window
});

// pipWindow is a new Window object
// pipWindow.document is accessible for DOM manipulation
```

## Examples

### Basic Picture-in-Picture Window

```typescript
async function openPictureInPictureWindow(): Promise<void> {
  if (!('documentPictureInPicture' in window)) {
    console.log('Document Picture-in-Picture not supported');
    return;
  }

  try {
    const pipWindow = await documentPictureInPicture.requestWindow({
      width: 400,
      height: 300
    });

    // Create content for PiP window
    const template = document.querySelector('#pip-template') as HTMLTemplateElement;
    const content = template.content.cloneNode(true);

    pipWindow.document.body.appendChild(content);

    // Add styling
    const style = pipWindow.document.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 1rem;
        font-family: system-ui, sans-serif;
        background: white;
      }
      h2 {
        margin-top: 0;
        font-size: 1.25rem;
      }
    `;
    pipWindow.document.head.appendChild(style);
  } catch (error) {
    console.error('Failed to open PiP:', error);
  }
}
```

### Video Player with Custom Controls

```typescript
class CustomVideoPlayer {
  private video: HTMLVideoElement;
  private pipWindow: Window | null = null;

  constructor(videoSelector: string) {
    this.video = document.querySelector(videoSelector) as HTMLVideoElement;
  }

  async openPictureInPicture(): Promise<void> {
    if (!('documentPictureInPicture' in window)) {
      alert('Picture-in-Picture not supported');
      return;
    }

    try {
      this.pipWindow = await documentPictureInPicture.requestWindow({
        width: 480,
        height: 320
      });

      this.renderControls();
      this.setupEventListeners();
    } catch (error) {
      console.error('PiP failed:', error);
    }
  }

  private renderControls(): void {
    if (!this.pipWindow) return;

    const doc = this.pipWindow.document;

    // Style
    const style = doc.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 1rem;
        font-family: system-ui, sans-serif;
        background: #1a1a1a;
        color: white;
      }
      h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
      }
      .control-group {
        margin-bottom: 1rem;
      }
      .label {
        font-size: 0.875rem;
        color: #aaa;
        margin-bottom: 0.5rem;
      }
      button {
        padding: 0.5rem 1rem;
        margin-right: 0.5rem;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.95rem;
      }
      button:hover {
        background: #0052a3;
      }
      input[type="range"] {
        width: 100%;
      }
    `;
    doc.head.appendChild(style);

    // Content
    const html = `
      <h2>Video Controls</h2>

      <div class="control-group">
        <div class="label">Playback</div>
        <button id="play">Play</button>
        <button id="pause">Pause</button>
      </div>

      <div class="control-group">
        <div class="label">Volume: <span id="volume-display">100</span>%</div>
        <input type="range" id="volume" min="0" max="100" value="100" />
      </div>

      <div class="control-group">
        <div class="label">Playback Rate</div>
        <button class="rate-btn" data-rate="0.5">0.5x</button>
        <button class="rate-btn" data-rate="1">1x</button>
        <button class="rate-btn" data-rate="1.5">1.5x</button>
        <button class="rate-btn" data-rate="2">2x</button>
      </div>

      <div class="control-group">
        <div class="label">Time</div>
        <input type="range" id="seek" min="0" max="100" value="0" />
        <div id="time-display">0:00 / 0:00</div>
      </div>

      <div class="control-group">
        <div class="label">Options</div>
        <button id="fullscreen">Fullscreen</button>
        <button id="pip-close">Close PiP</button>
      </div>
    `;

    doc.body.innerHTML = html;
  }

  private setupEventListeners(): void {
    if (!this.pipWindow) return;

    const doc = this.pipWindow.document;

    // Play/Pause
    doc.getElementById('play')?.addEventListener('click', () => {
      this.video.play();
    });

    doc.getElementById('pause')?.addEventListener('click', () => {
      this.video.pause();
    });

    // Volume
    const volumeInput = doc.getElementById('volume') as HTMLInputElement;
    const volumeDisplay = doc.getElementById('volume-display') as HTMLElement;

    volumeInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.video.volume = parseInt(value) / 100;
      volumeDisplay.textContent = value;
    });

    // Playback rate
    doc.querySelectorAll('.rate-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const rate = parseFloat((e.target as HTMLElement).getAttribute('data-rate') || '1');
        this.video.playbackRate = rate;
      });
    });

    // Seek
    const seekInput = doc.getElementById('seek') as HTMLInputElement;
    const timeDisplay = doc.getElementById('time-display') as HTMLElement;

    this.video.addEventListener('timeupdate', () => {
      seekInput.value = ((this.video.currentTime / this.video.duration) * 100).toString();
      timeDisplay.textContent = `${this.formatTime(this.video.currentTime)} / ${this.formatTime(this.video.duration)}`;
    });

    seekInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.video.currentTime = (this.video.duration * parseInt(value)) / 100;
    });

    // Fullscreen
    doc.getElementById('fullscreen')?.addEventListener('click', () => {
      this.video.requestFullscreen();
    });

    // Close PiP
    doc.getElementById('pip-close')?.addEventListener('click', () => {
      this.pipWindow?.close();
    });
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Usage
const player = new CustomVideoPlayer('video');
document.getElementById('open-pip')?.addEventListener('click', () => {
  player.openPictureInPicture();
});
```

### Live Metrics Dashboard

```typescript
class MetricsDashboard {
  private pipWindow: Window | null = null;
  private updateInterval: number | null = null;

  async openDashboard(): Promise<void> {
    if (!('documentPictureInPicture' in window)) {
      console.error('Picture-in-Picture not supported');
      return;
    }

    try {
      this.pipWindow = await documentPictureInPicture.requestWindow({
        width: 360,
        height: 400
      });

      this.renderDashboard();
      this.startUpdating();

      // Close handler
      this.pipWindow.addEventListener('unload', () => {
        this.stopUpdating();
      });
    } catch (error) {
      console.error('Failed to open metrics dashboard:', error);
    }
  }

  private renderDashboard(): void {
    if (!this.pipWindow) return;

    const doc = this.pipWindow.document;

    const style = doc.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 1rem;
        font-family: 'Courier New', monospace;
        background: #0f0f0f;
        color: #00ff00;
      }
      h2 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        border-bottom: 1px solid #333;
        padding-bottom: 0.5rem;
      }
      .metric {
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #222;
      }
      .metric-name {
        font-size: 0.75rem;
        color: #666;
        text-transform: uppercase;
        margin-bottom: 0.25rem;
      }
      .metric-value {
        font-size: 1.5rem;
        font-weight: bold;
      }
      .metric-unit {
        font-size: 0.85rem;
        color: #888;
      }
    `;
    doc.head.appendChild(style);

    doc.body.innerHTML = `
      <h2>System Metrics</h2>
      <div class="metric">
        <div class="metric-name">Memory Usage</div>
        <div class="metric-value"><span id="memory">0</span> <span class="metric-unit">MB</span></div>
      </div>

      <div class="metric">
        <div class="metric-name">FCP</div>
        <div class="metric-value"><span id="fcp">0</span> <span class="metric-unit">ms</span></div>
      </div>

      <div class="metric">
        <div class="metric-name">LCP</div>
        <div class="metric-value"><span id="lcp">0</span> <span class="metric-unit">ms</span></div>
      </div>

      <div class="metric">
        <div class="metric-name">INP</div>
        <div class="metric-value"><span id="inp">0</span> <span class="metric-unit">ms</span></div>
      </div>

      <div class="metric">
        <div class="metric-name">FPS</div>
        <div class="metric-value"><span id="fps">60</span> <span class="metric-unit">Hz</span></div>
      </div>
    `;
  }

  private startUpdating(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const update = () => {
      if (!this.pipWindow || this.pipWindow.closed) {
        this.stopUpdating();
        return;
      }

      // Update metrics
      this.updateMemory();
      this.updateWebVitals();

      // Calculate FPS
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        this.updateFPS(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  }

  private updateMemory(): void {
    if (!this.pipWindow) return;

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(1);
      const el = this.pipWindow.document.getElementById('memory');
      if (el) el.textContent = usedMB;
    }
  }

  private updateWebVitals(): void {
    if (!this.pipWindow) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          const el = this.pipWindow!.document.getElementById('fcp');
          if (el) el.textContent = entry.startTime.toFixed(0);
        } else if (entry.entryType === 'largest-contentful-paint') {
          const el = this.pipWindow!.document.getElementById('lcp');
          if (el) el.textContent = entry.startTime.toFixed(0);
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'paint'] });
  }

  private updateFPS(frameCount: number): void {
    if (!this.pipWindow) return;

    const el = this.pipWindow.document.getElementById('fps');
    if (el) el.textContent = frameCount.toString();
  }

  private stopUpdating(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Usage
const dashboard = new MetricsDashboard();
document.getElementById('metrics')?.addEventListener('click', () => {
  dashboard.openDashboard();
});
```

### Floating Chat Window

```typescript
class FloatingChat {
  private pipWindow: Window | null = null;

  async openChat(): Promise<void> {
    if (!('documentPictureInPicture' in window)) {
      console.error('Picture-in-Picture not supported');
      return;
    }

    try {
      this.pipWindow = await documentPictureInPicture.requestWindow({
        width: 400,
        height: 500
      });

      this.renderChat();
      this.setupListeners();
    } catch (error) {
      console.error('Failed to open chat:', error);
    }
  }

  private renderChat(): void {
    if (!this.pipWindow) return;

    const doc = this.pipWindow.document;

    const style = doc.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        font-family: system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: white;
      }
      .header {
        padding: 1rem;
        border-bottom: 1px solid #e0e0e0;
        background: #f5f5f5;
      }
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
      }
      .message {
        margin-bottom: 1rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        max-width: 85%;
      }
      .message.sent {
        background: #0066cc;
        color: white;
        margin-left: auto;
      }
      .message.received {
        background: #e0e0e0;
        color: #333;
      }
      .input-area {
        padding: 1rem;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 0.5rem;
      }
      input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 0.25rem;
        font: inherit;
      }
      button {
        padding: 0.5rem 1rem;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
      }
    `;
    doc.head.appendChild(style);

    doc.body.innerHTML = `
      <div class="header">
        <h3 style="margin: 0;">Chat</h3>
      </div>
      <div class="messages" id="messages"></div>
      <div class="input-area">
        <input id="message-input" type="text" placeholder="Type a message..." />
        <button id="send">Send</button>
      </div>
    `;
  }

  private setupListeners(): void {
    if (!this.pipWindow) return;

    const doc = this.pipWindow.document;
    const input = doc.getElementById('message-input') as HTMLInputElement;
    const sendBtn = doc.getElementById('send') as HTMLButtonElement;
    const messagesDiv = doc.getElementById('messages') as HTMLElement;

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;

      // Display sent message
      const msgEl = doc.createElement('div');
      msgEl.className = 'message sent';
      msgEl.textContent = text;
      messagesDiv.appendChild(msgEl);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      input.value = '';

      // Simulate response
      setTimeout(() => {
        const responseEl = doc.createElement('div');
        responseEl.className = 'message received';
        responseEl.textContent = 'Thanks for the message!';
        messagesDiv.appendChild(responseEl);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, 500);
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }
}

// Usage
const chat = new FloatingChat();
document.getElementById('chat')?.addEventListener('click', () => {
  chat.openChat();
});
```

### Teleprompter

```typescript
class Teleprompter {
  private pipWindow: Window | null = null;

  async openTeleprompter(script: string): Promise<void> {
    if (!('documentPictureInPicture' in window)) {
      console.error('Picture-in-Picture not supported');
      return;
    }

    try {
      this.pipWindow = await documentPictureInPicture.requestWindow({
        width: 600,
        height: 400
      });

      this.renderTeleprompter(script);
    } catch (error) {
      console.error('Failed to open teleprompter:', error);
    }
  }

  private renderTeleprompter(script: string): void {
    if (!this.pipWindow) return;

    const doc = this.pipWindow.document;

    const style = doc.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 2rem;
        font-family: Georgia, serif;
        background: black;
        color: white;
        overflow: hidden;
      }
      .script {
        font-size: 2rem;
        line-height: 1.6;
        animation: scroll 30s linear forwards;
      }
      @keyframes scroll {
        from { transform: translateY(100vh); }
        to { transform: translateY(-100vh); }
      }
      button {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        padding: 0.75rem 1.5rem;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        z-index: 1000;
      }
    `;
    doc.head.appendChild(style);

    doc.body.innerHTML = `
      <div class="script">${script}</div>
      <button id="close">Close</button>
    `;

    doc.getElementById('close')?.addEventListener('click', () => {
      this.pipWindow?.close();
    });
  }
}

// Usage
const teleprompter = new Teleprompter();
document.getElementById('teleprompter')?.addEventListener('click', () => {
  teleprompter.openTeleprompter('Your script here...');
});
```

## Event Handling

```typescript
// Close event
pipWindow?.addEventListener('unload', () => {
  console.log('PiP window closed');
});

// Content change
const observer = new MutationObserver(() => {
  console.log('Content changed in PiP');
});

observer.observe(pipWindow!.document.body, { childList: true, subtree: true });
```

## CSS in Picture-in-Picture

```typescript
const cssLink = pipWindow!.document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = '/styles.css';
pipWindow!.document.head.appendChild(cssLink);
```

## Real-World Benefits

- **Multi-window UI** - Content stays visible alongside browser
- **Always-on-top** - Window floats above other apps
- **Independent scrolling** - Dashboard scrolls independently
- **Custom controls** - Full HTML/CSS freedom
- **No iframe limits** - Full document access
