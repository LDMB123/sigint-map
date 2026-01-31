# DMB Almanac Performance Reference

## Lazy Loading
- Route-level code splitting via SvelteKit dynamic imports
- Image lazy loading with `loading="lazy"` attribute
- Component lazy loading for below-fold content
- Intersection Observer for progressive data loading

## DevTools Profiling
- Chrome Performance tab: record, analyze, identify long tasks
- Lighthouse CI for automated performance scoring
- Web Vitals: LCP, FID/INP, CLS tracking
- Memory profiling via Performance Monitor panel

## Trace Capture
- `performance.mark()` and `performance.measure()` for custom metrics
- Navigation Timing API for page load breakdown
- Resource Timing API for asset load analysis
- Long Animation Frames API for jank detection

## RUM (Real User Monitoring)
- Web Vitals library integration
- Custom metric collection (data load time, chart render time)
- Beacon API for non-blocking metric submission
- Dashboard visualization of performance trends

## Bundle Optimization
- Vite bundle visualizer for treemap analysis
- Dynamic imports at route boundaries
- Tree-shaking verification for unused exports
- CSS extraction and minification
