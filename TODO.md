# App-Nag Blocker - Remaining Work

## Before Release

### Must Have
- [ ] Test popup UI - verify whitelist add/remove and global toggle work
- [x] Add extension icon (16x16, 32x32, 48x48, 128x128)
- [x] Reduce verbose logging for production (DEBUG flag added)
- [ ] AMO submission prep:
  - [x] Write privacy policy (see PRIVACY.md)
  - [x] Write extension description (see AMO_LISTING.md)
  - [ ] Create screenshots
  - [x] Review permissions justification (see AMO_LISTING.md)

### Should Have
- [ ] Test on more sites to expand phrase coverage
- [ ] Verify extension works on Firefox Android

## Post-MVP Features

- [ ] Feedback mechanism for missed/false positive reporting
- [ ] User-adjustable timing settings (debounce, observer duration)
- [ ] Statistics tracking (nags blocked per site)
- [ ] Export/import whitelist

## Technical Debt

- [ ] `processedElements` WeakSet may not catch elements recreated by sites
- [ ] No way to re-enable scanning after 10 second timeout for late nags
- [ ] Consider adding a manual "scan now" button in popup for edge cases

## Tested Sites

| Site | Status | Notes |
|------|--------|-------|
| Instagram | Working | "Watch this reel in the app" detected |
| LinkedIn | Working | |
| X/Twitter | Working | Multiple sequential nags handled |
| Reddit | Untested | Site stopped showing nag during testing |
| Yelp | Blocked | 403 from bot protection |
| Quora | N/A | Requires login |
| Medium | N/A | Requires login |
