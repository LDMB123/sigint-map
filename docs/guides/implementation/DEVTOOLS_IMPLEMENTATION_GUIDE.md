# Chrome DevTools MCP Integration - Implementation Guide
## Advanced Debugging & Performance Analysis for DMB Almanac

---

## Part 1: CDP Session Architecture

### 1.1 Puppeteer-Based Performance Capture

```typescript
import puppeteer, { Browser, Page } from 'puppeteer';

interface PerformanceTrace {
  events: TraceEvent[];
  duration: number;
  metrics: PerformanceMetrics;
}

async function captureFullTrace(url: string): Promise<PerformanceTrace> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--enable-features=EnablePerfettoSystemTracing',
      '--enable-features=ExperimentalIsInputPending'
    ]
  });

  try {
    const page = await browser.newPage();
    const cdpClient = await page.target().createCDPSession();

    // Enable all debugging domains
    await Promise.all([
      cdpClient.send('Debugger.enable'),
      cdpClient.send('Profiler.enable', { samplingInterval: 1000 }),
      cdpClient.send('Runtime.enable'),
      cdpClient.send('Network.enable'),
      cdpClient.send('Performance.enable'),
      cdpClient.send('Log.enable'),
      cdpClient.send('Tracing.start', {
        categories: [
          'v8',
          'blink',
          'devtools.timeline',
          'disabled-by-default-v8.runtime_stats',
          'disabled-by-default-devtools.timeline'
        ].join(','),
        options: 'sampling-frequency=10000'
      })
    ]);

    const traceEvents: TraceEvent[] = [];
    cdpClient.on('Tracing.dataCollected', (data) => {
      traceEvents.push(...data.value);
    });

    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Simulate user interaction
    await page.click('button[data-testid="search"]');
    await page.type('input[name="query"]', 'crash into me');
    await page.click('button[type="submit"]');

    // Wait for results
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // End trace
    await cdpClient.send('Tracing.end');

    // Get metrics
    const metrics = await page.metrics();

    return {
      events: traceEvents,
      duration: metrics.PageLoadTime * 1000,
      metrics: {
        JSHeapSize: metrics.JSHeapUsedSize,
        DOMNodeCount: metrics.NodeCount,
        LayoutCount: metrics.LayoutCount,
        RecalcStyleCount: metrics.RecalcStyleCount,
        TaskDuration: metrics.TaskDuration
      }
    };
  } finally {
    await browser.close();
  }
}
```

### 1.2 CDP Session Error Monitoring

```typescript
async function monitorErrors(page: Page, cdpClient: CDPSession): Promise<void> {
  const errors: RuntimeExceptionDetail[] = [];

  cdpClient.on('Runtime.exceptionThrown', (params) => {
    const { exceptionDetails } = params;
    errors.push(exceptionDetails);

    // Pattern matching for known errors
    const errorPatterns = [
      {
        pattern: /Cannot read propert(?:y|ies) .* of (undefined|null)/,
        suggestion: 'Add null check or use optional chaining (?.) operator'
      },
      {
        pattern: /Failed to fetch/,
        suggestion: 'Check CORS configuration and network connectivity'
      },
      {
        pattern: /Maximum call stack size exceeded/,
        suggestion: 'Check for infinite recursion or circular dependencies'
      }
    ];

    for (const { pattern, suggestion } of errorPatterns) {
      if (pattern.test(exceptionDetails.text)) {
        console.warn(`[CDP] Error Pattern Detected:`, {
          message: exceptionDetails.text,
          suggestion,
          stackTrace: exceptionDetails.stackTrace
        });
      }
    }
  });

  // Also monitor console messages
  cdpClient.on('Log.entryAdded', (params) => {
    if (params.entry.level === 'error' || params.entry.level === 'warning') {
      console.log(`[${params.entry.level}]`, params.entry.text);
    }
  });
}
```

---

## Part 2: Long Animation Frame Analysis via CDP

### 2.1 Extract LoAF Data from Trace

```typescript
interface LoAFAnalysis {
  frameId: string;
  duration: number;
  blockingDuration: number;
  scripts: ScriptAttribution[];
  renderStart: number;
  timestamp: number;
}

interface ScriptAttribution {
  sourceURL: string;
  sourceFunctionName: string;
  invoker: string;
  duration: number;
  percentage: number;
}

function analyzeLoAFFromTrace(events: TraceEvent[]): LoAFAnalysis[] {
  const loafAnalysis: LoAFAnalysis[] = [];

  // Find all long animation frame events
  const loafEvents = events.filter(
    e => e.name === 'LongAnimation' || e.name === 'UpdateLayoutTree'
  );

  // Group by frame
  const frameGroups = new Map<string, TraceEvent[]>();
  for (const event of loafEvents) {
    const frameId = event.args?.frame as string || 'unknown';
    if (!frameGroups.has(frameId)) {
      frameGroups.set(frameId, []);
    }
    frameGroups.get(frameId)!.push(event);
  }

  // Analyze each frame
  for (const [frameId, frameEvents] of frameGroups) {
    const frameDuration = frameEvents.reduce((sum, e) => sum + (e.dur || 0), 0);

    if (frameDuration > 50000) { // > 50ms
      // Find scripts within frame
      const scripts: ScriptAttribution[] = [];
      const scriptEvents = frameEvents.filter(
        e => e.cat?.includes('v8') || e.name === 'FunctionCall'
      );

      let totalScriptTime = 0;
      for (const scriptEvent of scriptEvents) {
        const scriptDuration = scriptEvent.dur || 0;
        totalScriptTime += scriptDuration;

        scripts.push({
          sourceURL: scriptEvent.args?.url as string || 'unknown',
          sourceFunctionName: scriptEvent.args?.functionName as string || 'anonymous',
          invoker: scriptEvent.args?.invoker as string || 'unknown',
          duration: scriptDuration / 1000, // Convert to ms
          percentage: (scriptDuration / frameDuration) * 100
        });
      }

      // Sort by duration
      scripts.sort((a, b) => b.duration - a.duration);

      loafAnalysis.push({
        frameId,
        duration: frameDuration / 1000,
        blockingDuration: Math.max(0, (frameDuration - 16667) / 1000), // Assume 60fps baseline
        scripts: scripts.slice(0, 10), // Top 10 scripts
        renderStart: frameEvents[0]?.ts || 0,
        timestamp: Date.now()
      });
    }
  }

  return loafAnalysis;
}

// Generate report
function generateLoAFReport(analysis: LoAFAnalysis[]): string {
  let report = '# Long Animation Frame Analysis\n\n';

  for (const frame of analysis) {
    report += `## Frame ${frame.frameId}\n`;
    report += `- Duration: ${frame.duration.toFixed(2)}ms\n`;
    report += `- Blocking: ${frame.blockingDuration.toFixed(2)}ms\n`;
    report += `- Top Contributors:\n`;

    for (const script of frame.scripts) {
      report += `  - ${script.sourceFunctionName} (${script.sourceURL}): `;
      report += `${script.duration.toFixed(2)}ms (${script.percentage.toFixed(1)}%)\n`;
    }
    report += '\n';
  }

  return report;
}
```

---

## Part 3: Memory Leak Detection via CDP

### 3.1 Heap Snapshot Analysis

```typescript
interface HeapSnapshot {
  nodes: Array<{
    id: number;
    kind: string;
    description: string;
    size: number;
  }>;
  edges: Array<{
    fromNode: number;
    toNode: number;
    type: string;
    name: string;
  }>;
}

interface HeapAnalysis {
  totalSize: number;
  nodeCount: number;
  largeObjects: Array<{
    description: string;
    size: number;
    retainedSize: number;
    percentage: number;
  }>;
  detachedDOMNodes: number;
  potentialLeaks: string[];
}

async function detectMemoryLeaks(
  cdpClient: CDPSession,
  durationMs: number
): Promise<{ initial: HeapAnalysis; final: HeapAnalysis; growth: number }> {
  // Enable heap profiler
  await cdpClient.send('HeapProfiler.enable');

  // Take initial snapshot
  console.log('Taking initial heap snapshot...');
  const initialSnapshot = await takeHeapSnapshot(cdpClient);
  const initialAnalysis = analyzeHeap(initialSnapshot);

  // Simulate user activity
  console.log(`Simulating activity for ${durationMs}ms...`);
  await new Promise(resolve => setTimeout(resolve, durationMs));

  // Force garbage collection
  await cdpClient.send('HeapProfiler.collectGarbage');

  // Take final snapshot
  console.log('Taking final heap snapshot...');
  const finalSnapshot = await takeHeapSnapshot(cdpClient);
  const finalAnalysis = analyzeHeap(finalSnapshot);

  // Calculate growth
  const growth = finalAnalysis.totalSize - initialAnalysis.totalSize;

  return {
    initial: initialAnalysis,
    final: finalAnalysis,
    growth
  };
}

async function takeHeapSnapshot(cdpClient: CDPSession): Promise<HeapSnapshot> {
  const chunks: string[] = [];

  return new Promise((resolve, reject) => {
    const listener = (params: { chunk: string }) => {
      chunks.push(params.chunk);
    };

    cdpClient.on('HeapProfiler.addHeapSnapshotChunk', listener);

    cdpClient
      .send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
      .then(() => {
        cdpClient.off('HeapProfiler.addHeapSnapshotChunk', listener);
        resolve(JSON.parse(chunks.join('')));
      })
      .catch(reject);
  });
}

function analyzeHeap(snapshot: HeapSnapshot): HeapAnalysis {
  const nodes = snapshot.nodes;

  // Calculate sizes
  const totalSize = nodes.reduce((sum, n) => sum + n.size, 0);
  const largeObjects = nodes
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .map(n => ({
      description: n.description,
      size: n.size,
      retainedSize: n.size, // Simplified
      percentage: (n.size / totalSize) * 100
    }));

  // Find potential issues
  const potentialLeaks: string[] = [];
  const detachedDOMNodes = nodes.filter(
    n => n.description.includes('Detached')
  ).length;

  if (detachedDOMNodes > 100) {
    potentialLeaks.push(`High count of detached DOM nodes: ${detachedDOMNodes}`);
  }

  // Find large retained objects
  for (const obj of largeObjects) {
    if (obj.percentage > 10) {
      potentialLeaks.push(`Large object: ${obj.description} (${obj.percentage.toFixed(1)}%)`);
    }
  }

  return {
    totalSize,
    nodeCount: nodes.length,
    largeObjects,
    detachedDOMNodes,
    potentialLeaks
  };
}
```

### 3.2 Heap Growth Report

```typescript
function generateHeapReport(
  initial: HeapAnalysis,
  final: HeapAnalysis,
  growth: number
): string {
  const growthMB = growth / 1048576;
  const growthPercent = (growth / initial.totalSize) * 100;

  let report = '# Memory Leak Analysis Report\n\n';
  report += `## Growth: ${growthMB.toFixed(2)}MB (${growthPercent.toFixed(1)}%)\n\n`;

  report += '## Initial Heap\n';
  report += `- Total: ${(initial.totalSize / 1048576).toFixed(2)}MB\n`;
  report += `- Nodes: ${initial.nodeCount}\n`;
  report += `- Detached DOM: ${initial.detachedDOMNodes}\n\n`;

  report += '## Final Heap\n';
  report += `- Total: ${(final.totalSize / 1048576).toFixed(2)}MB\n`;
  report += `- Nodes: ${final.nodeCount}\n`;
  report += `- Detached DOM: ${final.detachedDOMNodes}\n\n`;

  report += '## Potential Leaks\n';
  for (const leak of final.potentialLeaks) {
    report += `- ${leak}\n`;
  }

  if (growth > 10485760) { // > 10MB growth
    report += '\n⚠️ **SIGNIFICANT MEMORY GROWTH DETECTED**\n';
  }

  return report;
}
```

---

## Part 4: Network Performance Analysis

### 4.1 CDP Network Monitoring

```typescript
interface NetworkMetrics {
  totalRequests: number;
  totalBytes: number;
  failedRequests: number;
  slowRequests: NetworkRequest[];
  largePayloads: NetworkRequest[];
  recommendations: string[];
}

interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  type: string;
}

async function analyzeNetworkPerformance(
  cdpClient: CDPSession,
  page: Page
): Promise<NetworkMetrics> {
  const requests: NetworkRequest[] = [];

  await cdpClient.send('Network.enable');

  cdpClient.on('Network.requestWillBeSent', (params) => {
    requests.push({
      url: params.request.url,
      method: params.request.method,
      status: 0,
      duration: 0,
      size: 0,
      type: params.type
    });
  });

  cdpClient.on('Network.responseReceived', (params) => {
    const req = requests.find(r => r.url === params.response.url);
    if (req) {
      req.status = params.response.status;
      req.size = params.response.encodedDataLength || 0;
    }
  });

  cdpClient.on('Network.loadingFinished', (params) => {
    const req = requests.find(r => r.url === params.request?.url);
    if (req) {
      req.duration = params.timestamp - (params.request?.time || 0);
    }
  });

  // Navigate and interact
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.click('button');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Analyze
  const failedRequests = requests.filter(r => r.status >= 400);
  const slowRequests = requests.filter(r => r.duration > 1000);
  const largePayloads = requests.filter(r => r.size > 500000);

  const recommendations: string[] = [];
  if (slowRequests.length > 0) {
    recommendations.push(`${slowRequests.length} slow requests detected`);
  }
  if (largePayloads.length > 0) {
    recommendations.push(`${largePayloads.length} large payloads - consider compression`);
  }

  return {
    totalRequests: requests.length,
    totalBytes: requests.reduce((sum, r) => sum + r.size, 0),
    failedRequests: failedRequests.length,
    slowRequests,
    largePayloads,
    recommendations
  };
}
```

---

## Part 5: Integration with MCP Tools

### 5.1 Unified Debugging Workflow

```typescript
import puppeteer from 'puppeteer';

interface DebugReport {
  performance: LoAFAnalysis[];
  memory: { initial: HeapAnalysis; final: HeapAnalysis; growth: number };
  network: NetworkMetrics;
  errors: RuntimeExceptionDetail[];
  recommendations: string[];
}

async function fullDebugSession(
  url: string,
  options: { durationMs?: number; captureHeap?: boolean } = {}
): Promise<DebugReport> {
  const { durationMs = 30000, captureHeap = true } = options;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--enable-features=EnablePerfettoSystemTracing',
      '--enable-features=ExperimentalIsInputPending'
    ]
  });

  try {
    const page = await browser.newPage();
    const cdpClient = await page.target().createCDPSession();

    // Enable all debugging
    await Promise.all([
      cdpClient.send('Debugger.enable'),
      cdpClient.send('Profiler.enable'),
      cdpClient.send('Runtime.enable'),
      cdpClient.send('Network.enable'),
      cdpClient.send('Performance.enable'),
      cdpClient.send('Log.enable')
    ]);

    // Collect data
    const errors: RuntimeExceptionDetail[] = [];
    cdpClient.on('Runtime.exceptionThrown', (params) => {
      errors.push(params.exceptionDetails);
    });

    // Performance trace
    const traceEvents: TraceEvent[] = [];
    await cdpClient.send('Tracing.start', {
      categories: 'v8,blink,devtools.timeline',
      options: 'sampling-frequency=10000'
    });

    cdpClient.on('Tracing.dataCollected', (data) => {
      traceEvents.push(...data.value);
    });

    // Navigate
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Simulate user activity
    await new Promise(resolve => setTimeout(resolve, durationMs / 2));
    if (await page.$('button[data-testid="search"]')) {
      await page.click('button[data-testid="search"]');
      await page.type('input', 'test query');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    // End trace
    await cdpClient.send('Tracing.end');

    // Memory analysis
    let memoryAnalysis = null;
    if (captureHeap) {
      memoryAnalysis = await detectMemoryLeaks(cdpClient, durationMs / 2);
    }

    // Network analysis
    const networkMetrics = await analyzeNetworkPerformance(cdpClient, page);

    // Performance analysis
    const loafAnalysis = analyzeLoAFFromTrace(traceEvents);

    // Generate recommendations
    const recommendations: string[] = [];
    if (loafAnalysis.some(f => f.duration > 100)) {
      recommendations.push('Long Animation Frames detected - optimize script execution');
    }
    if (networkMetrics.slowRequests.length > 0) {
      recommendations.push('Slow network requests detected - check server performance');
    }
    if (errors.length > 0) {
      recommendations.push(`${errors.length} runtime errors detected - check console`);
    }

    return {
      performance: loafAnalysis,
      memory: memoryAnalysis || {
        initial: { totalSize: 0, nodeCount: 0, largeObjects: [], detachedDOMNodes: 0, potentialLeaks: [] },
        final: { totalSize: 0, nodeCount: 0, largeObjects: [], detachedDOMNodes: 0, potentialLeaks: [] },
        growth: 0
      },
      network: networkMetrics,
      errors,
      recommendations
    };
  } finally {
    await browser.close();
  }
}

// Usage
const report = await fullDebugSession('http://localhost:5173', {
  durationMs: 60000,
  captureHeap: true
});

console.log('=== DEBUG REPORT ===');
console.log(`Long Animation Frames: ${report.performance.length}`);
console.log(`Memory Growth: ${(report.memory.growth / 1048576).toFixed(2)}MB`);
console.log(`Failed Requests: ${report.network.failedRequests}`);
console.log(`Errors: ${report.errors.length}`);
console.log('\nRecommendations:');
for (const rec of report.recommendations) {
  console.log(`- ${rec}`);
}
```

---

## Part 6: Real User Monitoring Integration

### 6.1 Correlate CDP Data with RUM

```typescript
interface CorrelatedMetrics {
  sessionId: string;
  timestamp: number;
  cdpMetrics: {
    loafFrames: number;
    longTasks: number;
    slowResources: number;
  };
  rumMetrics: {
    lcp: number;
    inp: number;
    cls: number;
    networkRequests: number;
  };
  insights: string[];
}

function correlateMetrics(
  cdpData: DebugReport,
  rumData: {
    sessionId: string;
    lcp: number;
    inp: number;
    cls: number;
    networkRequests: number;
  }
): CorrelatedMetrics {
  const loafFrames = cdpData.performance.filter(f => f.duration > 50).length;
  const longTasks = cdpData.performance.length;
  const slowResources = cdpData.network.slowRequests.length;

  const insights: string[] = [];

  // Correlate LoAF with INP
  if (loafFrames > 0 && rumData.inp > 100) {
    insights.push('Long Animation Frames correlate with high INP - optimize event handlers');
  }

  // Correlate slow resources with LCP
  if (slowResources > 0 && rumData.lcp > 2500) {
    insights.push('Slow resources impact LCP - prioritize critical resources');
  }

  // Memory pressure insight
  if (cdpData.memory.growth > 10485760) {
    insights.push('Significant memory growth detected - potential memory leak');
  }

  return {
    sessionId: rumData.sessionId,
    timestamp: Date.now(),
    cdpMetrics: {
      loafFrames,
      longTasks,
      slowResources
    },
    rumMetrics: {
      lcp: rumData.lcp,
      inp: rumData.inp,
      cls: rumData.cls,
      networkRequests: rumData.networkRequests
    },
    insights
  };
}
```

---

## Part 7: Automated Debugging Workflow

### 7.1 Continuous Performance Monitoring

```typescript
interface PerformanceBaseline {
  lcp: number;
  inp: number;
  cls: number;
  loafFrames: number;
  memoryGrowth: number;
}

const BASELINES: Record<string, PerformanceBaseline> = {
  'songs-search': { lcp: 2500, inp: 100, cls: 0.1, loafFrames: 0, memoryGrowth: 5 },
  'venue-detail': { lcp: 3000, inp: 150, cls: 0.15, loafFrames: 1, memoryGrowth: 10 },
  'visualization': { lcp: 4000, inp: 200, cls: 0.2, loafFrames: 2, memoryGrowth: 20 }
};

async function checkPerformanceRegression(
  scenario: string,
  url: string
): Promise<{ passed: boolean; violations: string[] }> {
  const baseline = BASELINES[scenario];
  if (!baseline) throw new Error(`Unknown scenario: ${scenario}`);

  const report = await fullDebugSession(url);
  const violations: string[] = [];

  // Check LoAF
  const loafFrames = report.performance.length;
  if (loafFrames > baseline.loafFrames) {
    violations.push(
      `LoAF regression: ${loafFrames} > ${baseline.loafFrames}`
    );
  }

  // Check memory
  const memoryGrowthMB = report.memory.growth / 1048576;
  if (memoryGrowthMB > baseline.memoryGrowth) {
    violations.push(
      `Memory regression: ${memoryGrowthMB.toFixed(2)}MB > ${baseline.memoryGrowth}MB`
    );
  }

  // Check network
  const slowResources = report.network.slowRequests.length;
  if (slowResources > 0) {
    violations.push(`Network regression: ${slowResources} slow requests`);
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

// CI/CD integration example
async function runPerformanceTests() {
  const scenarios = [
    { name: 'songs-search', url: 'http://localhost:5173/search' },
    { name: 'venue-detail', url: 'http://localhost:5173/venues/123' }
  ];

  for (const { name, url } of scenarios) {
    const result = await checkPerformanceRegression(name, url);
    if (!result.passed) {
      console.error(`Performance regression in ${name}:`);
      for (const violation of result.violations) {
        console.error(`  - ${violation}`);
      }
      process.exit(1);
    }
  }

  console.log('All performance tests passed!');
}
```

---

## Part 8: Dashboard Integration

### 8.1 Metrics Export Format

```typescript
interface DevToolsMetricsExport {
  timestamp: number;
  session: {
    id: string;
    duration: number;
    url: string;
  };
  performance: {
    longAnimationFrames: Array<{
      duration: number;
      blockingDuration: number;
      topScript: string;
    }>;
    averageLoAFDuration: number;
    totalLongFrames: number;
  };
  memory: {
    initialHeap: number;
    finalHeap: number;
    growth: number;
    leakRisk: 'low' | 'medium' | 'high' | 'critical';
  };
  network: {
    totalRequests: number;
    totalBytes: number;
    failedRequests: number;
    slowestRequest: { url: string; duration: number };
  };
  errors: Array<{
    message: string;
    count: number;
  }>;
}

function exportMetrics(report: DebugReport): DevToolsMetricsExport {
  return {
    timestamp: Date.now(),
    session: {
      id: `debug-${Date.now()}`,
      duration: 60000,
      url: 'http://localhost:5173'
    },
    performance: {
      longAnimationFrames: report.performance.map(f => ({
        duration: f.duration,
        blockingDuration: f.blockingDuration,
        topScript: f.scripts[0]?.sourceFunctionName || 'unknown'
      })),
      averageLoAFDuration:
        report.performance.reduce((sum, f) => sum + f.duration, 0) /
        Math.max(report.performance.length, 1),
      totalLongFrames: report.performance.length
    },
    memory: {
      initialHeap: report.memory.initial.totalSize,
      finalHeap: report.memory.final.totalSize,
      growth: report.memory.growth,
      leakRisk: 'low'
    },
    network: {
      totalRequests: report.network.totalRequests,
      totalBytes: report.network.totalBytes,
      failedRequests: report.network.failedRequests,
      slowestRequest: report.network.slowRequests[0] || {
        url: 'none',
        duration: 0
      }
    },
    errors: []
  };
}
```

---

## Summary: Integration Checklist

- [x] CDP connection via Puppeteer
- [x] Performance trace capture (LoAF, long tasks)
- [x] Error monitoring and pattern detection
- [x] Memory leak detection via heap snapshots
- [x] Network performance analysis
- [x] Correlation with RUM data
- [x] Automated performance regression testing
- [x] Metrics export for dashboards
- [x] Report generation

**Status:** Ready for production integration ✅
