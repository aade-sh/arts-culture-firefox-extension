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
   git clone https://github.com/aade-sh/arts-culture-firefox-extension
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

## Architecture

### Core Design

**Single Manager Pattern**: `ArtManager` coordinates all art operations through a unified interface.

### Components

- **ArtManager** (`src/background/art-manager.ts`) - Central coordinator for providers and state management
- **Providers** - Pluggable art data sources:
  - **Interface**: `ArtProvider` contract defines common operations
  - **Base Class**: `ArtProviderBase` provides shared functionality for caching and HTTP requests
  - **Implementations**: `GoogleArtsProvider`, `MetMuseumProvider`
- **Storage Layer** (`src/background/storage.ts`) - Unified storage abstraction
- **Cache Manager** (`src/background/cache-manager.ts`) - Handles data and image caching with TTL

### Data Flow

1. **Initialize**: Manager starts up and registers available providers
2. **Route Operations**: All art operations flow through the current active provider
3. **State Persistence**: User settings and current state persist automatically across sessions
4. **Caching**: Art metadata and images are cached per-provider with 24-hour expiry

### Storage

The extension uses two different storage mechanisms for optimal performance:

- **Chrome Storage API** (`chrome.storage.local`) - For JSON data including:
  - Art metadata (titles, creators, URLs)
  - Cache timestamps and asset counts
  - User settings and preferences
- **Web Cache API** (`caches`) - For binary image data:
  - Cached artwork images
  - Optimized for large binary assets
  - Namespace-isolated per art provider

All storage operations are abstracted through the `ExtensionStorage` class in `src/background/storage.ts`.

## Legal

This is an **unofficial educational project** not affiliated with Google. Art data is accessed through reverse-engineered endpoints and remains property of respective museums and Google Arts & Culture.

## License

MIT License
