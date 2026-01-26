# DMB Almanac - Testing Checklist

Use this checklist to verify all fixes are working correctly.

---

## ✅ Pre-Testing Setup

### Environment Configuration

```bash
cd app

# 1. Verify .env exists
[ -f .env ] && echo "✓ .env exists" || echo "✗ Create .env from .env.example"

# 2. Check .env has required variables
grep -q "VITE_VAPID_PUBLIC_KEY=" .env && echo "✓ VAPID public key set"
grep -q "VAPID_PRIVATE_KEY=" .env && echo "✓ VAPID private key set"
grep -q "PUSH_API_KEY=" .env && echo "✓ Push API key set"

# 3. Verify .env is gitignored
grep -q "^\.env$" .gitignore && echo "✓ .env in .gitignore"
```

### Build Verification

```bash
# 1. Install dependencies
npm install

# 2. Run type check
npm run check

# 3. Build application
npm run build

# 4. Start dev server
npm run dev
```

---

## 🧪 Manual Testing

### 1. PWA Installation Testing

#### Desktop Chrome/Edge (Supported)

- [ ] Open http://localhost:5173 in Chrome
- [ ] Wait 5 seconds
- [ ] Scroll down at least 200px
- [ ] **Expected:** Install banner appears at bottom
- [ ] Banner shows: "Install DMB Almanac" with Install/Not now buttons
- [ ] Click "Install" button
- [ ] **Expected:** Browser install dialog appears
- [ ] Confirm installation
- [ ] **Expected:** App installs, icon appears in taskbar/dock
- [ ] Launch installed app
- [ ] **Expected:** App opens in standalone window (no browser chrome)

#### Desktop Safari (Not Supported)

- [ ] Open http://localhost:5173 in Safari
- [ ] **Expected:** No install prompt (beforeinstallprompt not supported)

#### Mobile Chrome/Android (Supported)

- [ ] Open site on Android Chrome
- [ ] Wait 5 seconds and scroll
- [ ] **Expected:** Install banner appears
- [ ] Tap "Install"
- [ ] **Expected:** Add to Home Screen dialog
- [ ] Confirm
- [ ] **Expected:** Icon added to home screen
- [ ] Tap icon
- [ ] **Expected:** App opens fullscreen

#### Mobile Safari/iOS (Manual Instructions)

- [ ] Open site on iPhone Safari
- [ ] Wait 5 seconds and scroll
- [ ] **Expected:** Banner shows with "How to Install" button
- [ ] Tap button
- [ ] **Expected:** Alert with iOS installation instructions
- [ ] Follow instructions: Share → Add to Home Screen
- [ ] **Expected:** App icon added to home screen
- [ ] Tap icon
- [ ] **Expected:** App opens

#### Install Prompt Dismissal

- [ ] Dismiss install prompt (click "Not now")
- [ ] Refresh page
- [ ] **Expected:** Prompt does not appear
- [ ] Check localStorage: `pwa-install-prompt-dismissed` should exist
- [ ] Delete localStorage key
- [ ] Refresh
- [ ] **Expected:** Prompt appears again after 5s + scroll

---

### 2. Push Notification Testing

#### Subscription Flow

- [ ] With VAPID keys configured, open DevTools Console
- [ ] Run:
```javascript
// Check if push is configured
console.log('VAPID Public Key:', import.meta.env.VITE_VAPID_PUBLIC_KEY?.slice(0, 20) + '...');

// Request notification permission
Notification.requestPermission().then(result => {
  console.log('Permission:', result);
});
```
- [ ] **Expected:** Permission prompt appears
- [ ] Grant permission
- [ ] **Expected:** Console shows "Permission: granted"

#### Send Test Push (Server-Side)

```bash
# In app directory
curl -X POST http://localhost:5173/api/push-send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PUSH_API_KEY" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test from DMB Almanac",
    "subscriptionIds": []
  }'
```

- [ ] **Expected:** 403 Unauthorized (if API key wrong)
- [ ] **Expected:** 200 OK (if API key correct)
- [ ] **Expected:** Notification appears on desktop

#### Security Testing

```bash
# Test without authentication
curl -X POST http://localhost:5173/api/push-send \
  -H "Content-Type: application/json" \
  -d '{"title":"Hack","body":"Test"}'
```

- [ ] **Expected:** 403 Forbidden response
- [ ] Server logs show "Unauthorized push-send attempt"

---

### 3. Accessibility Testing

#### Color Contrast

- [ ] Inspect any muted text on page (descriptions, metadata)
- [ ] Use browser DevTools → Accessibility panel
- [ ] Check contrast ratio
- [ ] **Expected:** Ratio ≥ 4.5:1 (WCAG AA)
- [ ] **Light mode:** ~5.1:1 (oklch 0.45 on cream)
- [ ] **Dark mode:** ~7.2:1 (oklch 0.65 on dark)

#### Screen Reader Testing

**NVDA on Windows:**
```
1. Start NVDA (Insert+N)
2. Navigate to http://localhost:5173
3. Tab through page
4. Expected: Install prompt is announced
5. Expected: "Install DMB Almanac" heading read
6. Expected: Buttons have clear labels ("Install", "Not now")
```

**VoiceOver on macOS:**
```
1. Enable VoiceOver (Cmd+F5)
2. Navigate to site
3. VO+Right Arrow through content
4. Expected: Install banner announced as "alert"
5. Expected: Button purposes clear
```

#### Keyboard Navigation

- [ ] Tab to install prompt
- [ ] **Expected:** Focus visible on "Not now" button
- [ ] Tab again
- [ ] **Expected:** Focus moves to "Install" button
- [ ] Tab again
- [ ] **Expected:** Focus moves to X close button
- [ ] Press Enter on "Install"
- [ ] **Expected:** Browser install dialog opens

---

### 4. Service Worker Testing

#### Registration

Open DevTools → Application → Service Workers

- [ ] **Expected:** Service worker registered
- [ ] URL: `/sw.js`
- [ ] Status: activated and running
- [ ] Scope: `/`

#### Cache Version

Check console logs on page load:

- [ ] **Expected:** `[SW] Cache version: v<version>-<git-hash>`
- [ ] Version matches package.json version
- [ ] Hash matches git commit (or "dev" in development)

#### Update Flow

```bash
# Simulate update
1. Edit package.json version (e.g., 1.0.0 → 1.0.1)
2. Rebuild: npm run build
3. Refresh page
4. Expected: Console shows new SW waiting
5. Expected: Update banner appears
6. Click "Update Now"
7. Expected: Page reloads with new SW active
```

#### Offline Behavior

- [ ] Load page while online
- [ ] DevTools → Network → Offline checkbox
- [ ] Navigate to cached pages
- [ ] **Expected:** Pages load from cache
- [ ] **Expected:** "You're offline - viewing cached content" banner

---

### 5. Build & Production Testing

#### Type Safety

```bash
npm run check
```

- [ ] **Expected:** No critical type errors
- [ ] Known remaining errors documented in TYPESCRIPT_QUICK_FIXES.md

#### Production Build

```bash
npm run build
ls -lh .svelte-kit/output
```

- [ ] **Expected:** Build succeeds
- [ ] **Expected:** Output files created
- [ ] Check bundle size (should be reasonable)

#### Preview Production Build

```bash
npm run preview
```

- [ ] Open http://localhost:4173
- [ ] Test install prompt
- [ ] Test service worker
- [ ] **Expected:** Everything works as in dev mode

---

## 🐛 Known Issues & Workarounds

### Issue: Install Prompt Doesn't Appear

**Possible Causes:**
1. Browser already has app installed → Uninstall app first
2. Dismissal period active → Clear localStorage `pwa-install-prompt-dismissed`
3. No HTTPS in production → PWA requires HTTPS (except localhost)
4. Didn't scroll → Scroll down 200px if `requireScroll={true}`
5. Visited before 5 seconds → Wait full 5 seconds

### Issue: Push Subscription Fails

**Possible Causes:**
1. VAPID public key not set → Check import.meta.env.VITE_VAPID_PUBLIC_KEY
2. Invalid key format → Should be 86+ base64url characters
3. Service worker not active → Check DevTools Application panel
4. No HTTPS → Push requires secure context

### Issue: Build Fails

**Possible Causes:**
1. Node version too old → Requires Node 18+
2. Missing dependencies → Run `npm install`
3. Type errors → Run `npm run check` for details

---

## 📊 Test Results Template

```markdown
## Test Results - [Date]

### Environment
- OS:
- Browser:
- Node Version:
- App Version:

### PWA Installation
- [ ] Install prompt appears
- [ ] Installation succeeds
- [ ] App launches standalone

### Push Notifications
- [ ] Subscription works
- [ ] Test push received
- [ ] Unauthorized access blocked

### Accessibility
- [ ] Color contrast passes
- [ ] Screen reader compatible
- [ ] Keyboard navigation works

### Build
- [ ] Type check passes
- [ ] Production build succeeds
- [ ] Preview works

### Issues Found
[List any issues encountered]

### Notes
[Additional observations]
```

---

## ✉️ Reporting Issues

If tests fail:

1. **Check console logs** - Most issues show clear error messages
2. **Verify environment** - Ensure .env has all required keys
3. **Clear cache** - Try hard refresh (Ctrl+Shift+R)
4. **Check DevTools** - Application panel shows SW/Storage state
5. **Review docs** - See FIXES_APPLIED_SUMMARY.md for expected behavior

For persistent issues:
- Document exact steps to reproduce
- Include console error messages
- Note browser and OS versions
- Check if issue exists in documentation

---

**Status:** Use this checklist after every fix deployment to ensure nothing broke.

**Automation:** Consider converting manual tests to Playwright E2E tests for CI/CD integration.
