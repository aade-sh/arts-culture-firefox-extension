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

## Build Scripts

Available commands:

```bash
pnpm run build           # Build both newtab and background scripts
pnpm run build:newtab    # Build only the newtab component
pnpm run build:background # Build only the background script
pnpm run dev             # Build and watch for changes
pnpm run clean           # Clean build artifacts
```

The build process uses:

- **Vite** for fast bundling and development
- **TypeScript** compilation with ES2020 target
- **Preact** with React compatibility layer
- Code bundling and minification for production
- Generates `newtab/newtab-bundle.js` and `dist/background.js`

## Project Structure

```
├── manifest.json          # Extension configuration
├── src/                   # Source code
│   ├── background/        # Background scripts (TypeScript)
│   │   ├── background.ts  # Main background script
│   │   ├── art-manager.ts # Art data management
│   │   └── providers/     # Art provider integrations
│   ├── components/        # Preact/React components
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── newtab.tsx        # New tab page entry point
├── newtab/               # New tab page assets
│   ├── newtab.html       # HTML template
│   ├── newtab.css        # Styles
│   └── newtab-bundle.js  # Generated bundle
├── dist/                 # Build output
│   └── background.js     # Generated background script
├── icons/                # Extension icons
├── vite.config.ts        # Vite build configuration
└── tsconfig.json         # TypeScript configuration
```

## Legal

This is an **unofficial educational project** not affiliated with Google. Art data is accessed through reverse-engineered endpoints and remains property of respective museums and Google Arts & Culture.

## License

MIT License - see [LICENSE](LICENSE) file for details.
