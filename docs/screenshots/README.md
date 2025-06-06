# Screenshots

This directory contains screenshots of the MarkdownMate application for documentation purposes.

## Required Screenshots

### Landing Page Screenshot
- **File**: `landing-page.png`
- **Size**: 1600x900 pixels (recommended)
- **Format**: PNG
- **Description**: Shows the main landing page with "Beautiful Markdown, Together" hero section

To capture the landing page screenshot:

1. Open the application at the root URL
2. Ensure the page is fully loaded
3. Take a screenshot of the full landing page
4. Resize to 1600x900 pixels
5. Save as `docs/screenshots/landing-page.png`

### Editor Screenshot (Optional)
- **File**: `editor-view.png`
- **Size**: 1600x900 pixels (recommended)
- **Format**: PNG
- **Description**: Shows the collaborative editor interface

## Screenshot Guidelines

- Use high resolution (at least 1600x900)
- Ensure text is readable
- Show realistic content, not placeholder text
- Capture at 100% zoom level
- Use PNG format for best quality
- Remove any sensitive information

## Automated Screenshot Generation

For automated screenshot generation in CI/CD:

```bash
# Install puppeteer for automated screenshots
npm install --save-dev puppeteer

# Create screenshot script
node scripts/generate-screenshots.js
```