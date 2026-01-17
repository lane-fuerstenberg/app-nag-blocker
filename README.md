# App-Nag Blocker

A Firefox extension that automatically detects and dismisses "Use our app" prompts on websites. Built for mobile users who prefer staying in the browser.

## Install

[Install from Firefox Add-ons](https://addons.mozilla.org/firefox/addon/app-nag-blocker/) (link pending approval)

## Features

- Automatically detects app-nag modals and banners using text pattern matching
- Finds and clicks dismiss buttons to cleanly close prompts
- Per-site whitelisting
- Global on/off toggle
- Minimal performance impact (observer auto-disables after 10 seconds)
- No data collection - fully private

## Installation

### Prerequisites

- Node.js (v18+)
- npm
- Firefox (for testing)

### Setup

```bash
npm install
npm run build
```

### Load in Firefox (Development)

1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the project root

### Build for Production

```bash
npx web-ext build
```

Output will be in `web-ext-artifacts/`.

## Development

```bash
npm run watch    # Rebuild on file changes
npm run typecheck # Run TypeScript type checking
```

### Project Structure

```
app-nagger-blocker/
  src/
    content.ts      # Core detection/dismissal logic (runs in web pages)
    background.ts   # Storage and message handling
    popup/
      popup.html    # Toolbar popup UI
      popup.ts      # Popup logic
    types.ts        # Shared TypeScript types
  dist/             # Compiled JS output (git-ignored)
  manifest.json     # Extension manifest (MV2)
  package.json
  tsconfig.json
```

## How It Works

1. **Detection**: Content script scans for fixed-position elements that contain app-nag phrases like "open in app", "view in app", "get the app", etc.

2. **Dismissal**: Searches for dismiss buttons by:
   - `aria-label` containing "close", "dismiss"
   - Text matching "not now", "continue in browser", etc.
   - Elements with `class*="close"`

3. **Timing**:
   - Initial scan on page load
   - MutationObserver watches for new elements (first 3 seconds: immediate, then 300ms debounce)
   - Observer auto-disables after 10 seconds to save resources

## Configuration

Click the extension icon in the toolbar to:
- Toggle the extension on/off globally
- Whitelist the current site (nags will not be blocked)
- View and manage whitelisted sites

## Supported Sites

Tested on:
- Instagram
- LinkedIn
- X/Twitter

Should work on any site using common app-nag patterns.

## Building from Source

### Requirements

- **Operating System:** Any (Linux, macOS, Windows)
- **Node.js:** v18 or higher
- **npm:** v9 or higher (included with Node.js)

### Build Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension (compiles TypeScript to JavaScript):
   ```bash
   npm run build
   ```
   This runs esbuild to compile `src/*.ts` files into `dist/` and `src/popup/popup.js`.

3. Package for distribution:
   ```bash
   npx web-ext build --ignore-files="src/*.ts" "node_modules/**" "*.md" "tsconfig.json" "package*.json"
   ```
   The extension ZIP will be in `web-ext-artifacts/`.

### Build Script

All build steps are defined in `package.json`:
- `npm run build` - Compiles TypeScript source to JavaScript
- `npm run typecheck` - Runs TypeScript type checking
- `npm run watch` - Rebuilds on file changes (development)

## Contributing

Contributions welcome! If the extension misses an app-nag prompt or triggers a false positive:

1. Open an issue with the site URL and what happened
2. Include console logs if possible (`[App-Nag Blocker]` prefix)

To add new patterns, edit the arrays in `src/content.ts`:
- `appNagPatterns` - regex patterns that match app-nag text
- `dismissPatterns` - regex patterns that match dismiss button text

## License

MIT
