#!/usr/bin/env python3
"""
Statistical Validation Visualization
Generates publication-quality charts for the statistical proof report.
"""

import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# Set style for publication-quality plots
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 8)
plt.rcParams['font.size'] = 11
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['legend.fontsize'] = 10

# Load results
results_path = Path(__file__).parent / 'raw-results.json'
with open(results_path) as f:
    data = json.load(f)

results = data['results']
analysis = data['analysis']

# Extract speedups
speedups = [r['speedup'] for r in results if r['success']]
categories = {}
complexities = {}

for r in results:
    if not r['success']:
        continue

    # By category
    if r['category'] not in categories:
        categories[r['category']] = []
    categories[r['category']].append(r['speedup'])

    # By complexity
    if r['complexity'] not in complexities:
        complexities[r['complexity']] = []
    complexities[r['complexity']].append(r['speedup'])

# ============================================================================
# Figure 1: Overall Distribution with Confidence Interval
# ============================================================================

fig, ax = plt.subplots(1, 1, figsize=(12, 6))

# Histogram
ax.hist(speedups, bins=50, alpha=0.7, color='steelblue', edgecolor='black', density=True)

# Mean and CI
mean_speedup = analysis['overallStats']['meanSpeedup']
ci_lower = analysis['overallStats']['ci95']['lower']
ci_upper = analysis['overallStats']['ci95']['upper']

ax.axvline(mean_speedup, color='darkred', linestyle='--', linewidth=2, label=f'Mean: {mean_speedup:.2f}x')
ax.axvline(ci_lower, color='orange', linestyle=':', linewidth=2, label=f'95% CI: [{ci_lower:.2f}x, {ci_upper:.2f}x]')
ax.axvline(ci_upper, color='orange', linestyle=':', linewidth=2)

# 10x target
ax.axvline(10, color='green', linestyle='-', linewidth=2, alpha=0.5, label='10x Target')

# Fill CI region
ax.axvspan(ci_lower, ci_upper, alpha=0.2, color='orange')

ax.set_xlabel('Productivity Speedup (x)')
ax.set_ylabel('Density')
ax.set_title('Distribution of Productivity Speedups with 95% Confidence Interval', fontweight='bold')
ax.legend(loc='upper right')
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(Path(__file__).parent / 'fig1-distribution.png', dpi=300, bbox_inches='tight')
print("Generated: fig1-distribution.png")

# ============================================================================
# Figure 2: Performance by Task Category
# ============================================================================

fig, ax = plt.subplots(1, 1, figsize=(12, 6))

category_stats = analysis['byCategory']
category_names = [c['category'] for c in category_stats]
category_means = [c['meanSpeedup'] for c in category_stats]
category_ci_lower = [c['ci95']['lower'] for c in category_stats]
category_ci_upper = [c['ci95']['upper'] for c in category_stats]
category_errors = [
    [category_means[i] - category_ci_lower[i] for i in range(len(category_means))],
    [category_ci_upper[i] - category_means[i] for i in range(len(category_means))]
]

x_pos = np.arange(len(category_names))
bars = ax.bar(x_pos, category_means, color='steelblue', alpha=0.7, edgecolor='black')
ax.errorbar(x_pos, category_means, yerr=category_errors, fmt='none', ecolor='darkred',
            capsize=5, capthick=2, linewidth=2)

# 10x reference line
ax.axhline(10, color='green', linestyle='--', linewidth=2, alpha=0.5, label='10x Target')

# Color bars based on performance
for i, (bar, mean) in enumerate(zip(bars, category_means)):
    if mean >= 10:
        bar.set_color('darkgreen')
        bar.set_alpha(0.7)
    elif mean >= 9:
        bar.set_color('orange')
        bar.set_alpha(0.7)

ax.set_xlabel('Task Category')
ax.set_ylabel('Mean Productivity Speedup (x)')
ax.set_title('Productivity Speedup by Task Category (with 95% CI)', fontweight='bold')
ax.set_xticks(x_pos)
ax.set_xticklabels(category_names, rotation=45, ha='right')
ax.legend()
ax.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig(Path(__file__).parent / 'fig2-by-category.png', dpi=300, bbox_inches='tight')
print("Generated: fig2-by-category.png")

# ============================================================================
# Figure 3: Performance by Complexity Level
# ============================================================================

fig, ax = plt.subplots(1, 1, figsize=(10, 6))

complexity_stats = analysis['byComplexity']
complexity_order = ['simple', 'medium', 'complex']
complexity_stats_ordered = sorted(complexity_stats,
                                  key=lambda x: complexity_order.index(x['category']))

complexity_names = [c['category'].capitalize() for c in complexity_stats_ordered]
complexity_means = [c['meanSpeedup'] for c in complexity_stats_ordered]
complexity_ci_lower = [c['ci95']['lower'] for c in complexity_stats_ordered]
complexity_ci_upper = [c['ci95']['upper'] for c in complexity_stats_ordered]
complexity_errors = [
    [complexity_means[i] - complexity_ci_lower[i] for i in range(len(complexity_means))],
    [complexity_ci_upper[i] - complexity_means[i] for i in range(len(complexity_means))]
]

x_pos = np.arange(len(complexity_names))
colors = ['#2ecc71', '#f39c12', '#e74c3c']  # Green, Orange, Red
bars = ax.bar(x_pos, complexity_means, color=colors, alpha=0.7, edgecolor='black')
ax.errorbar(x_pos, complexity_means, yerr=complexity_errors, fmt='none', ecolor='darkred',
            capsize=8, capthick=2, linewidth=2)

# 10x reference line
ax.axhline(10, color='green', linestyle='--', linewidth=2, alpha=0.5, label='10x Target')

ax.set_xlabel('Task Complexity')
ax.set_ylabel('Mean Productivity Speedup (x)')
ax.set_title('Productivity Speedup by Task Complexity (with 95% CI)', fontweight='bold')
ax.set_xticks(x_pos)
ax.set_xticklabels(complexity_names)
ax.legend()
ax.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig(Path(__file__).parent / 'fig3-by-complexity.png', dpi=300, bbox_inches='tight')
print("Generated: fig3-by-complexity.png")

# ============================================================================
# Figure 4: Box Plots by Category
# ============================================================================

fig, ax = plt.subplots(1, 1, figsize=(12, 6))

category_data = []
category_labels = []
for cat_stat in category_stats:
    category_data.append(categories[cat_stat['category']])
    category_labels.append(cat_stat['category'])

bp = ax.boxplot(category_data, labels=category_labels, patch_artist=True,
                showmeans=True, meanline=True)

# Color boxes
for patch in bp['boxes']:
    patch.set_facecolor('steelblue')
    patch.set_alpha(0.6)

# 10x reference line
ax.axhline(10, color='green', linestyle='--', linewidth=2, alpha=0.5, label='10x Target')

ax.set_xlabel('Task Category')
ax.set_ylabel('Productivity Speedup (x)')
ax.set_title('Distribution of Speedups by Task Category', fontweight='bold')
ax.set_xticklabels(category_labels, rotation=45, ha='right')
ax.legend()
ax.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig(Path(__file__).parent / 'fig4-boxplot-category.png', dpi=300, bbox_inches='tight')
print("Generated: fig4-boxplot-category.png")

# ============================================================================
# Figure 5: Violin Plots by Complexity
# ============================================================================

fig, ax = plt.subplots(1, 1, figsize=(10, 6))

complexity_data = []
complexity_labels = []
for comp in complexity_order:
    if comp in complexities:
        complexity_data.append(complexities[comp])
        complexity_labels.append(comp.capitalize())

parts = ax.violinplot(complexity_data, positions=range(len(complexity_labels)),
                      showmeans=True, showmedians=True)

# Color violins
colors = ['#2ecc71', '#f39c12', '#e74c3c']
for i, pc in enumerate(parts['bodies']):
    pc.set_facecolor(colors[i])
    pc.set_alpha(0.6)

# 10x reference line
ax.axhline(10, color='green', linestyle='--', linewidth=2, alpha=0.5, label='10x Target')

ax.set_xlabel('Task Complexity')
ax.set_ylabel('Productivity Speedup (x)')
ax.set_title('Distribution of Speedups by Task Complexity', fontweight='bold')
ax.set_xticks(range(len(complexity_labels)))
ax.set_xticklabels(complexity_labels)
ax.legend()
ax.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig(Path(__file__).parent / 'fig5-violin-complexity.png', dpi=300, bbox_inches='tight')
print("Generated: fig5-violin-complexity.png")

# ============================================================================
# Figure 6: Summary Statistics Table (as image)
# ============================================================================

fig, ax = plt.subplots(1, 1, figsize=(12, 4))
ax.axis('tight')
ax.axis('off')

table_data = [
    ['Metric', 'Value', '95% CI'],
    ['Mean Speedup', f"{mean_speedup:.2f}x", f"[{ci_lower:.2f}x, {ci_upper:.2f}x]"],
    ['Median Speedup', f"{analysis['overallStats']['medianSpeedup']:.2f}x", '-'],
    ['Std Deviation', f"±{analysis['overallStats']['stdDev']:.2f}x", '-'],
    ['Sample Size', f"{analysis['overallStats']['n']:,}", '-'],
    ['Success Rate', f"{analysis['overallStats']['successRate']*100:.1f}%", '-'],
]

table = ax.table(cellText=table_data, cellLoc='left', loc='center',
                colWidths=[0.4, 0.3, 0.3])
table.auto_set_font_size(False)
table.set_fontsize(12)
table.scale(1, 2)

# Style header row
for i in range(3):
    cell = table[(0, i)]
    cell.set_facecolor('#4472C4')
    cell.set_text_props(weight='bold', color='white')

# Alternate row colors
for i in range(1, len(table_data)):
    for j in range(3):
        cell = table[(i, j)]
        if i % 2 == 0:
            cell.set_facecolor('#E7E6E6')

ax.set_title('Overall Performance Summary', fontweight='bold', fontsize=14, pad=20)

plt.tight_layout()
plt.savefig(Path(__file__).parent / 'fig6-summary-table.png', dpi=300, bbox_inches='tight')
print("Generated: fig6-summary-table.png")

# ============================================================================
# Summary
# ============================================================================

print("\n" + "="*80)
print("VISUALIZATION COMPLETE")
print("="*80)
print(f"\nGenerated 6 publication-quality figures in:")
print(f"  {Path(__file__).parent}")
print("\nFigures:")
print("  1. fig1-distribution.png       - Overall speedup distribution with CI")
print("  2. fig2-by-category.png        - Mean speedup by task category")
print("  3. fig3-by-complexity.png      - Mean speedup by complexity level")
print("  4. fig4-boxplot-category.png   - Boxplots by category")
print("  5. fig5-violin-complexity.png  - Violin plots by complexity")
print("  6. fig6-summary-table.png      - Summary statistics table")
print("\nReady for inclusion in STATISTICAL_PROOF.md or presentations.")
print("="*80)
