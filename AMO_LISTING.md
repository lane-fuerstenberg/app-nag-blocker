# AMO Listing Information

## Summary (max 250 characters)

Automatically dismisses "Use our app" prompts on mobile websites. Stay in your browser without constant interruptions.

## Description

Tired of websites constantly nagging you to install their app? App-Nag Blocker automatically detects and dismisses those annoying "Open in App", "Get the App", and "Continue in Browser" prompts so you can browse in peace.

**Features:**

- Automatically detects app-nag modals and banners using text pattern matching
- Finds and clicks dismiss buttons to cleanly close prompts
- Per-site whitelisting if you want to see prompts on specific sites
- Global on/off toggle
- Minimal performance impact - detection stops after 10 seconds per page
- No data collection - fully private

**Works on:**

- Instagram
- LinkedIn
- X/Twitter
- And many other sites using common app-nag patterns

**How it works:**

The extension scans for fixed-position elements containing phrases like "open in app", "get the app", or "better in the app". When detected, it finds and clicks the dismiss button (like "Not now" or "Continue in browser") to close the prompt cleanly.

Click the toolbar icon to toggle the extension or whitelist specific sites.

**Source code:** [GitHub](https://github.com/lane-fuerstenberg/app-nag-blocker)

## Homepage/Support URL

https://github.com/lane-fuerstenberg/app-nag-blocker

## Categories

- Appearance

## Tags

app-nag, mobile, browser, popup-blocker, dismiss, privacy

---

## Permissions Justification

### storage
**Why needed:** To save user preferences including the enabled/disabled state and the list of whitelisted sites. This data is stored locally and never transmitted.

### activeTab
**Why needed:** To read the current tab's URL when the user opens the popup, so they can whitelist the current site. Only activated when the user clicks the extension icon.

### Content script on <all_urls>
**Why needed:** The extension must run on all websites to detect and dismiss app-nag prompts. It cannot predict which sites will show these prompts, so broad access is required.

**What it does:** The content script reads DOM elements to identify app-nag prompts by their text content and CSS properties. When found, it clicks the dismiss button. It does not read, collect, or transmit any user data, form inputs, passwords, or browsing history.

**Privacy safeguards:**
- No network requests are made by the extension
- No data is collected or transmitted
- Only interacts with elements matching specific app-nag patterns
- User can disable the extension globally or per-site
