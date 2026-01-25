# Parallel CSS Best Practices Audit

## Usage

Run this command to perform a comprehensive parallel audit of your CSS codebase, identifying optimization opportunities, maintainability issues, and modern CSS adoption.

```
/parallel-css-audit
```

## Instructions

Use a swarm pattern with 6 parallel Haiku workers to audit CSS comprehensively. Each worker specializes in a specific aspect of CSS quality and performance.

### Worker Assignments

**Worker 1: Architecture & Organization Auditor**
- Review CSS architecture patterns (BEM, ITCSS, etc.)
- Check for specificity wars and !important abuse
- Identify naming convention inconsistencies
- Review component encapsulation
- Flag global style pollution

**Worker 2: Modern CSS Features Analyst**
- Identify opportunities for CSS Custom Properties
- Check for CSS Grid/Flexbox optimization
- Review Container Queries adoption
- Find :has() and :where() opportunities
- Flag outdated layout techniques (floats, tables)

**Worker 3: Performance Auditor**
- Identify unused CSS rules
- Check selector complexity and performance
- Review critical CSS extraction
- Find render-blocking CSS issues
- Flag expensive CSS properties (filters, shadows)

**Worker 4: Responsive Design Validator**
- Audit breakpoint consistency
- Check mobile-first implementation
- Review fluid typography/spacing
- Validate touch target sizes
- Flag responsive design gaps

**Worker 5: Accessibility & UX Auditor**
- Check focus styles completeness
- Review color contrast handling
- Validate prefers-reduced-motion support
- Check prefers-color-scheme implementation
- Flag accessibility violations

**Worker 6: Maintainability Analyst**
- Identify duplicate style declarations
- Check for dead/orphaned CSS
- Review CSS-in-JS patterns if applicable
- Validate design token usage
- Flag technical debt hotspots

### Response Format

Provide a consolidated summary table followed by detailed findings:

| Worker | Area | Critical | Warning | Info | Estimated Impact |
|--------|------|----------|---------|------|------------------|
| 1 | Architecture | X | X | X | High/Med/Low |
| 2 | Modern Features | X | X | X | High/Med/Low |
| 3 | Performance | X | X | X | High/Med/Low |
| 4 | Responsive | X | X | X | High/Med/Low |
| 5 | Accessibility | X | X | X | High/Med/Low |
| 6 | Maintainability | X | X | X | High/Med/Low |

**CSS Health Score: X/100**
**Unused CSS Estimate: X KB (X%)**

Then provide:
1. Critical issues requiring immediate attention
2. Modern CSS migration opportunities
3. Performance optimization priorities
4. Accessibility fixes required
5. Refactoring recommendations
6. CSS budget recommendations
