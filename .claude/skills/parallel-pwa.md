---
skill: parallel-pwa
description: Parallel PWA Compliance Audit
---

# Parallel PWA Compliance Audit

## Usage

Run this command to perform a comprehensive parallel audit of your Progressive Web App compliance, covering installability, offline support, and modern PWA standards.

```
/parallel-pwa
```

## Instructions

Use a swarm pattern with 6 parallel Haiku workers to audit PWA compliance comprehensively. Each worker specializes in a specific pillar of PWA excellence.

### Worker Assignments

**Worker 1: Manifest & Installability Auditor**
- Validate web app manifest completeness
- Check icon sizes and formats (maskable, any)
- Review display modes and orientation
- Verify shortcuts and share_target configuration
- Flag installability blockers

**Worker 2: Service Worker Analyst**
- Review service worker registration
- Check caching strategies (Cache First, Network First, Stale While Revalidate)
- Validate precaching configuration
- Identify runtime caching gaps
- Flag service worker update issues

**Worker 3: Offline Experience Auditor**
- Test offline fallback pages
- Review offline data persistence
- Check background sync implementation
- Validate offline-first architecture
- Flag offline UX gaps

**Worker 4: Performance & Core Web Vitals**
- Audit LCP optimization for PWA
- Check FID/INP performance
- Review CLS stability
- Validate app shell architecture
- Flag performance bottlenecks

**Worker 5: Push & Engagement Auditor**
- Review push notification implementation
- Check notification permission patterns
- Validate badge API usage
- Review periodic background sync
- Flag engagement anti-patterns

**Worker 6: Security & Best Practices**
- Verify HTTPS enforcement
- Check CSP headers for PWA
- Review credential management
- Validate Web Share API usage
- Flag security vulnerabilities

### Response Format

Provide a consolidated summary table followed by detailed findings:

| Worker | Area | Pass | Warning | Fail | Lighthouse Impact |
|--------|------|------|---------|------|-------------------|
| 1 | Manifest | X | X | X | +X points |
| 2 | Service Worker | X | X | X | +X points |
| 3 | Offline | X | X | X | +X points |
| 4 | Performance | X | X | X | +X points |
| 5 | Engagement | X | X | X | +X points |
| 6 | Security | X | X | X | +X points |

**PWA Compliance Score: X/100**
**Estimated Lighthouse PWA Score: X/100**

Then provide:
1. Installability blockers to fix
2. Service worker improvements
3. Offline experience enhancements
4. Performance optimization priorities
5. Engagement feature roadmap
6. Complete PWA checklist with status
