# Bug Reports - DMB Database Frontend

---

## BUG-001: Console 404 Errors on All Pages

**Severity**: MEDIUM
**Priority**: P2
**Status**: OPEN
**Environment**: http://localhost:3000
**Browser/Device**: Chrome (also likely affects all browsers)
**Build/Version**: Current Development Build
**Reported**: January 11, 2026

### Summary
Every page navigation triggers console errors indicating a resource is returning 404 (Not Found). This error appears consistently across all pages in the application, occurring 7 times during the automated test suite execution.

### Steps to Reproduce
1. Open browser and navigate to http://localhost:3000
2. Open browser DevTools (F12)
3. Switch to Console tab
4. Observe 404 error(s)
5. Navigate to /shows, /songs, or /venues
6. Observe additional 404 errors on each navigation

### Expected Result
All resources should load successfully with no 404 errors in the console.

### Actual Result
Console displays: "Failed to load resource: the server responded with a status of 404 (Not Found)"

This occurs on:
- Homepage load
- /shows page load
- /songs page load
- /venues page load
- Every subsequent navigation

### Evidence
- **Console logs**: 7 instances recorded during automated testing
- **Impact**: Appears on all pages
- **Frequency**: 100% reproducible - occurs on every page load

### Additional Context
- **Frequency**: Always - reproducible on every page navigation
- **Workaround**: None needed - functionality not impacted
- **Related issues**: None identified

### Technical Details
**Error message**:
```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Likely candidates for investigation**:
- Favicon (favicon.ico)
- Web manifest (manifest.json)
- Font files
- Service worker
- Source maps
- API endpoints

**Investigation needed**:
1. Check Network tab in DevTools to identify specific failing resource
2. Review server/build configuration
3. Verify all referenced assets exist in build output
4. Check for hardcoded paths that may not exist

### Business Impact
- **User-facing**: No visible impact on functionality
- **Developer experience**: Console noise makes debugging harder
- **SEO/Performance**: May impact Lighthouse scores
- **Best practices**: Violates clean console standards

### Recommended Fix Priority
Medium - Does not block functionality but should be resolved to:
1. Maintain clean console for easier debugging
2. Improve developer experience
3. Meet production quality standards
4. Potentially improve performance scores

---

## BUG-002: Search Functionality Not Verified

**Severity**: MEDIUM
**Priority**: P2
**Status**: OPEN - NEEDS MANUAL TESTING
**Environment**: http://localhost:3000
**Browser/Device**: Chrome (Puppeteer)
**Build/Version**: Current Development Build
**Reported**: January 11, 2026

### Summary
Unable to verify search functionality through automated testing due to test script error. Search input field exists and accepts text input, but the actual search behavior (filtering/displaying results) was not confirmed.

### Steps to Reproduce
**Automated Test Steps** (resulted in error):
1. Navigate to http://localhost:3000
2. Locate search input field in header
3. Type "Ants Marching" into search field
4. Attempt to verify results

**Manual Test Steps** (recommended):
1. Navigate to http://localhost:3000
2. Click on search input in navigation header
3. Type "Ants Marching"
4. Press Enter or wait for results to appear
5. Verify results show songs/shows containing "Ants Marching"

### Expected Result
- Search input accepts text
- Search triggers filtering or navigation to results page
- Results display items matching "Ants Marching"
- Results may include songs, shows, or venues matching the query

### Actual Result
**Automated Test**:
- Search input field found successfully
- Text entry worked: "Ants Marching" typed into field
- Test script error: `page.waitForTimeout is not a function`
- Unable to verify if search results appeared

**Visual Evidence**:
- Screenshot shows search field with "Ants Marching" entered
- Cannot confirm if results displayed or how search behaves

### Evidence
- **Screenshot**: `06_search_error_1768179995608.png` - Shows search field with text entered
- **Error log**: Test results JSON shows script error
- **Test status**: FAIL (but due to test script issue, not confirmed app bug)

### Additional Context
- **Frequency**: Test script error (Puppeteer API issue)
- **Workaround**: Manual testing required
- **Impact**: Unknown - search may work correctly, needs verification

### Technical Details
**Test script error**:
```
page.waitForTimeout is not a function
```

**Root cause**: Puppeteer API change - `waitForTimeout` was deprecated and removed in newer versions. Test script needs update.

**Manual testing needed to verify**:
1. Does typing in search field trigger any action?
2. Is there a submit button or does it auto-search?
3. Do results appear inline, in a dropdown, or on a new page?
4. Does search work for:
   - Song names
   - Show dates
   - Venue names
   - Artist names
5. Are search results accurate and relevant?
6. Does clearing search restore original view?

### Investigation Checklist
- [ ] Manually type in search field and observe behavior
- [ ] Test various search queries (songs, venues, dates)
- [ ] Verify search results are accurate
- [ ] Check if search has autocomplete/suggestions
- [ ] Test edge cases (empty search, special characters, very long query)
- [ ] Verify search works on all pages (homepage, shows, songs, venues)
- [ ] Check mobile responsiveness of search

### Business Impact
- **User-facing**: Search is a core feature - if broken, impacts discoverability
- **User experience**: Users expect search to work for finding specific content
- **SEO**: Search functionality may be important for user engagement metrics

### Recommended Fix Priority
Medium-High - Search is a valuable feature that needs verification:
1. Manual testing to confirm functionality
2. If broken, should be fixed before production release
3. If working, update automated test script for future regression testing

### Next Steps
1. **Immediate**: Conduct manual testing of search functionality
2. **If working**: Document expected behavior, update test script
3. **If broken**: File detailed bug with steps to reproduce
4. **Future**: Fix automated test to use `page.waitForSelector()` or `setTimeout()` instead of deprecated method

---

## Summary Statistics

**Total Bugs**: 2
**Severity Breakdown**:
- Critical: 0
- High: 0
- Medium: 2
- Low: 0

**Status**:
- Open: 2
- In Progress: 0
- Fixed: 0
- Won't Fix: 0

**Priority**:
- P0: 0
- P1: 0
- P2: 2
- P3: 0

---

**Report Generated**: January 11, 2026
**QA Engineer**: QA Team
**Next Review**: After bug fixes implemented
