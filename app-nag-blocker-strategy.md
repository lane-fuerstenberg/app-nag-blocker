# App-Nag Blocker: Strategy Document

## Overview

A Firefox extension targeting Android users that automatically detects and dismisses "Use our app" prompts across websites. The goal is a general-purpose solution that works across any site employing these patterns, not a site-by-site whack-a-mole approach.

## Target Platform

- **Browser**: Firefox (Android primary, desktop secondary)
- **Distribution**: Firefox Add-ons (AMO)
- **Scope**: Any website that displays app-nag prompts

## Core Architecture

### Detection Pipeline

The extension uses a multi-stage gated approach to minimize false positives and unnecessary processing:

1. **Heuristic Trigger**: Monitor for DOM changes suggesting a modal/overlay has appeared
2. **OCR Classification**: Extract text from the suspected region and match against known app-nag phrases
3. **DOM Action**: Locate and trigger the dismiss element

This gated approach ensures DOM manipulation only occurs when we're confident we've identified an app-nag prompt.

### Stage 1: Heuristic Detection

Watch for signals that suggest a modal has appeared:

- Fixed/absolute positioned elements covering significant viewport area
- Semi-transparent backdrop elements
- `overflow: hidden` applied to body (scroll lock)
- High z-index elements appearing
- Visibility/display changes on overlay-like elements

Implementation: MutationObserver watching for relevant DOM changes, with debouncing to avoid excessive checks.

### Stage 2: OCR + Keyword Classification

Once a potential modal is detected, extract and analyze its text content.

**Known app-nag phrases** (non-exhaustive, expand over time):

- "Open in app"
- "Use the app"
- "Get the app"
- "Continue in app"
- "Get the full experience"
- "Better in the app"
- "Download our app"
- "Open in the [AppName] app"

**Known dismiss phrases**:

- "Not now"
- "Continue in browser"
- "Maybe later"
- "No thanks"
- "Stay on web"
- "Continue to site"
- "Close"

If we match app-nag phrases AND dismiss phrases, we have high confidence this is a dismissable app-nag prompt.

### Stage 3: DOM Interaction

Once classified as an app-nag prompt, find and click the dismiss element.

**Primary strategy: DOM text content search**

Traverse the modal's DOM subtree looking for elements whose `textContent` matches dismiss phrases. Click the matched element.

**Alternative strategies** (documented for future consideration):

1. **OCR with bounding boxes**: Use Tesseract.js or similar to get text positions, then `document.elementFromPoint()` to find the clickable element at those coordinates. More robust against unusual DOM structures, but adds complexity and potential coordinate mapping issues.

2. **Visual similarity matching**: Screenshot the modal and use image processing to identify button-like elements near dismiss text. Overkill for current scope but could handle image-based dismiss buttons.

3. **Click coordinate injection**: If we know where the dismiss text is visually, simulate a click at those coordinates without needing to identify the exact DOM element. Fragile and potentially blocked by some security policies.

4. **Accessibility tree traversal**: Use ARIA roles and labels to find dismissable elements. More reliable when sites have good accessibility markup, which many don't.

5. **Overlay removal with page restoration**: As a fallback when dismiss element can't be found, hide the overlay entirely and attempt to restore page functionality (remove scroll locks, restore pointer events). Less clean but better than nothing.

The DOM text search is the recommended starting point. Fall back to overlay removal only if dismiss element location fails.

## User Controls

### Per-Site Whitelisting

Users can whitelist specific sites where they want to see app prompts. Stored in extension local storage, accessible via:

- Extension popup/toolbar UI
- Quick whitelist action on the current site

### Global Toggle

Simple on/off switch to disable the extension entirely without uninstalling.

## Future Enhancements (Post-MVP)

### Feedback Mechanism

Allow users to report:

- **Missed prompts**: "This site has an app-nag you didn't catch"
- **False positives**: "You dismissed something I wanted"

Implementation options:

- Simple "report this page" button that logs the URL and page state locally
- Optional anonymous submission to a collection endpoint for pattern analysis
- Export function for users to share reports manually

This feeds into improving keyword lists and heuristics over time without requiring ML infrastructure.

### Fallback Analysis for Unrecognized Prompts

When heuristics detect a modal-like element but keyword matching fails to classify it, a fallback analysis could catch edge cases without running heavy processing on every page.

**Trigger condition**: Heuristic stage fires (suspected modal detected) but OCR/keyword stage fails to match known phrases.

**Option 1: Local lightweight model**

Run a small classifier only on ambiguous cases. Since it's not on the hot path, occasional latency spikes are more tolerable.

- Pros: No network dependency, no privacy concerns
- Cons: Still has battery/CPU impact; model needs to be small enough for mobile; requires training data and maintenance
- User control: Could be a toggle ("Use AI fallback for unknown prompts")

**Option 2: Remote API call**

Send a screenshot of the suspected modal to a vision-capable API (Claude, GPT-4V, etc.) asking "Is this an app-nag prompt? If so, where's the dismiss button?"

- Pros: High accuracy; no local compute burden; can handle novel patterns
- Cons: Latency (1-3 seconds); privacy implications (sending screenshots to third party); requires API key management and potentially costs money
- User control: Opt-in only with clear privacy disclosure

**Option 3: Deferred/async analysis**

Don't block on unrecognized modals. Instead, log them locally (URL, screenshot, DOM snapshot). Later—on wifi, while charging, or via manual trigger—batch-analyze logged cases to discover new patterns.

- Pros: Zero runtime impact; builds training data organically; no privacy concerns if analysis is local
- Cons: Doesn't help the user in the moment; requires secondary analysis pipeline
- User control: "Help improve detection" toggle that enables logging

**Option 4: User-assisted fallback**

If heuristics fire but keywords don't match, show a small non-intrusive prompt: "This looks like an app nag but I'm not sure. Dismiss it?" User taps yes/no.

- Pros: Simple; keeps user in control; no ML infrastructure; generates labeled data for future improvements
- Cons: Adds friction; relies on user engagement; not fully automatic
- User control: Inherent in the design

**Recommendation**

For MVP+1, start with Option 4 (user-assisted). It's low-tech, respects user agency, and generates feedback data. If that proves too intrusive or users want more automation, evaluate Option 1 (local model) or Option 2 (remote API) based on what the collected data reveals about how often the fallback triggers and what patterns it's missing.

### ML-Based Classification

Documented for completeness, but likely not viable for mobile as the primary detection method:

- Performance constraints on mobile browsers make inference expensive
- Battery and CPU impact would degrade user experience
- OCR + keywords approach is likely sufficient given formulaic nature of app-nag prompts

If the heuristic approach proves fundamentally insufficient, revisit this. Would require lightweight model (MobileNet-class), ONNX.js or TensorFlow.js runtime, and training data collection.

## Technical Considerations

### Performance

Mobile is the primary target, so efficiency matters:

- Debounce MutationObserver callbacks
- Only run OCR on suspected modal regions, not full page
- Cache keyword regex patterns
- Minimize DOM traversal scope

### Page Compatibility

Some sites may break if their modal isn't "properly" dismissed:

- Monitor for and remove scroll locks (`overflow: hidden` on body)
- Restore `pointer-events` if disabled on underlying content
- May need site-specific fixups for stubborn cases

### AMO Review Compliance

To ensure smooth review process:

- Keep code unminified and readable
- Document permission justifications clearly
- No remote code loading
- No obfuscation
- Clear privacy policy (no data collection in MVP)

## MVP Scope

### Included

- Heuristic modal detection
- OCR/keyword classification
- DOM-based dismiss action
- Per-site whitelisting
- Global on/off toggle
- AMO distribution

### Excluded (Future)

- Feedback/reporting mechanism
- ML-based classification
- Cross-browser support
- Automated site-specific fixups

## Open Questions

- **OCR library choice**: Tesseract.js is the obvious option but may be heavy. Evaluate if pure DOM text extraction is sufficient for most cases, reserving OCR for sites that render text as images.
- **Keyword list maintenance**: How to expand the phrase lists over time? Manual curation vs. community contributions vs. automated discovery.
- **Timing sensitivity**: Some sites load app-nag prompts after a delay or scroll event. How aggressively do we watch for late-appearing modals?

## Next Steps

1. Scaffold Firefox extension with basic manifest and permissions
2. Implement MutationObserver-based heuristic detection
3. Build keyword matching against DOM text content
4. Implement dismiss element location and click
5. Add whitelisting UI
6. Test across target sites (Instagram, Reddit, Twitter, etc.)
7. Package and submit to AMO
