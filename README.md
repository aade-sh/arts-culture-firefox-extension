# Arts and Culture New Tab - Firefox Extension

Firefox extension that transforms your new tab into a curated art gallery featuring works from Google Arts & Culture and Metropolitan Museum.

Inspired by [Google Arts and Culture extension](https://chromewebstore.google.com/detail/google-arts-culture/akimgimeeoiognljlfchpbkpfbmeapkh?hl=en)

## Build Requirements

- **Node.js**: v18.0.0 or higher
- **Package Manager**: pnpm (recommended) or npm
- **Operating System**: macOS, Linux, or Windows

## Build Instructions

1. **Install Node.js and pnpm**:

   ```bash
   # Install Node.js from https://nodejs.org
   # Install pnpm globally
   npm install -g pnpm
   ```

2. **Clone and build the extension**:

   ```bash
   git clone <repository-url>
   cd arts-and-culture-firefox-extension
   pnpm install
   pnpm run build
   ```

3. **Add required icons** to `icons/` directory (16x16, 32x32, 48x48, 128x128 px)

4. **Load in Firefox**:
   - Open `about:debugging` → "This Firefox"
   - Click "Load Temporary Add-on" → select `manifest.json`

## Build Script

The `pnpm run build` command executes:

- TypeScript compilation with Rollup
- Preact/React compatibility layer setup
- Code bundling and minification for production
- Generates `newtab/newtab-bundle.js` and `dist/background.js`

## Project Structure

```
├── manifest.json          # Extension config
├── src/
│   ├── background/        # Background scripts (TypeScript)
│   ├── components/        # React components
│   ├── hooks/            # Custom hooks
│   └── types.ts          # Type definitions
├── newtab/               # New tab page
└── icons/                # Extension icons (need to add)
```

## Legal

This is an **unofficial educational project** not affiliated with Google. Art data is accessed through reverse-engineered endpoints and remains property of respective museums and Google Arts & Culture.

## License

MIT License - see [LICENSE](LICENSE) file for details.
