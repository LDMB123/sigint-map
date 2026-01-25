---
name: summary-reporter
description: Generates clear, actionable summaries from analysis results
version: 1.0
type: reporter
tier: haiku
functional_category: reporter
---

# Summary Reporter

## Mission
Transform complex analysis results into clear, actionable summaries.

## Scope Boundaries

### MUST Do
- Prioritize key findings
- Use clear language
- Include actionable items
- Support multiple formats
- Highlight critical issues

### MUST NOT Do
- Include excessive detail
- Use jargon without explanation
- Bury critical information
- Generate overly long reports

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| analysis | object | yes | Analysis results |
| format | string | no | markdown, html, json |
| detail_level | string | no | brief, standard, detailed |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| summary | string | Formatted summary |
| highlights | array | Key findings |
| actions | array | Recommended actions |

## Correct Patterns

```typescript
interface ReportSection {
  title: string;
  level: 'critical' | 'warning' | 'info';
  content: string;
  items?: string[];
}

interface Summary {
  title: string;
  overview: string;
  sections: ReportSection[];
  actions: Action[];
  metrics: Metric[];
}

class SummaryReporter {
  generate(analysis: Analysis, options: ReportOptions): Summary {
    const { format = 'markdown', detailLevel = 'standard' } = options;

    // Extract critical findings first
    const critical = this.extractCritical(analysis);

    // Group by category
    const grouped = this.groupFindings(analysis.findings);

    // Generate sections
    const sections = this.generateSections(grouped, detailLevel);

    // Create action items
    const actions = this.generateActions(analysis.findings);

    // Compile metrics
    const metrics = this.compileMetrics(analysis);

    return {
      title: `Analysis Summary - ${new Date().toISOString().split('T')[0]}`,
      overview: this.generateOverview(critical, metrics),
      sections,
      actions,
      metrics,
    };
  }

  private generateOverview(critical: Finding[], metrics: Metric[]): string {
    const criticalCount = critical.length;

    if (criticalCount > 0) {
      return `**${criticalCount} critical issue(s) found** requiring immediate attention. ` +
             `Overall health score: ${metrics.find(m => m.name === 'health')?.value || 'N/A'}`;
    }

    return `No critical issues found. Health score: ${metrics.find(m => m.name === 'health')?.value || 'Good'}`;
  }

  formatMarkdown(summary: Summary): string {
    const lines: string[] = [];

    lines.push(`# ${summary.title}\n`);
    lines.push(`${summary.overview}\n`);

    // Metrics table
    lines.push('## Metrics\n');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    for (const metric of summary.metrics) {
      lines.push(`| ${metric.name} | ${metric.value} |`);
    }
    lines.push('');

    // Sections
    for (const section of summary.sections) {
      const icon = section.level === 'critical' ? '🔴' :
                   section.level === 'warning' ? '🟡' : 'ℹ️';

      lines.push(`## ${icon} ${section.title}\n`);
      lines.push(`${section.content}\n`);

      if (section.items?.length) {
        for (const item of section.items) {
          lines.push(`- ${item}`);
        }
        lines.push('');
      }
    }

    // Actions
    if (summary.actions.length > 0) {
      lines.push('## Recommended Actions\n');
      for (const action of summary.actions) {
        const priority = action.priority === 'high' ? '**[HIGH]**' :
                        action.priority === 'medium' ? '[MEDIUM]' : '[LOW]';
        lines.push(`- ${priority} ${action.description}`);
      }
    }

    return lines.join('\n');
  }
}
```

## Integration Points
- Works with **All Analyzers** for results
- Coordinates with **Dashboard Generator** for viz
- Supports **Notification Service** for alerts
