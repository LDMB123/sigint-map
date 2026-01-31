# DMB Almanac Technical Reference

## Browser APIs
- Chromium 143+ features (CSS light-dark, field-sizing, reading-flow)
- Navigation API (Chrome 102+)
- File Handler API for PWA file management
- Passive event listeners for scroll performance

## ESM Technical Details
- SvelteKit ESM-first module resolution
- Dynamic imports for code splitting
- Tree-shaking optimization patterns

## CSS Modernization
- CSS logical properties (inline/block instead of left/right)
- CSS light-dark() for theme switching
- CSS nesting for component styles

## Error Handling System
- Global error boundary with aria-live announcements
- Service worker error recovery
- Network failure graceful degradation
- Structured error logging with severity levels

## D3.js Visualization Integration
- Shared d3-utils.ts module for all 5 visualization components
- Responsive SVG container patterns
- Accessibility-first chart patterns with aria-labels
- Performance: requestAnimationFrame for updates

## Memory Monitoring
- Performance.measureUserAgentSpecificMemory() API
- Leak detection via periodic heap snapshots
- Service worker memory budget management
- Component cleanup patterns (onDestroy lifecycle)

## Security Practices
- Content Security Policy headers
- Subresource Integrity for CDN assets
- XSS prevention in data rendering
- CORS configuration for API endpoints
