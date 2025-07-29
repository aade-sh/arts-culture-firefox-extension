# Arts and Culture New Tab - Firefox Extension

TypeScript-based Firefox extension that transforms your new tab into a curated art gallery featuring works from Google Arts & Culture and Metropolitan Museum.\
\
Inspired by [Google Arts and Culture extension](https://chromewebstore.google.com/detail/google-arts-culture/akimgimeeoiognljlfchpbkpfbmeapkh?hl=en)

## Installation

1. Add icons to `icons/` directory (16x16, 32x32, 48x48, 128x128 px)
2. Open Firefox → `about:debugging` → "This Firefox"
3. Click "Load Temporary Add-on" → select `manifest.json`
4. Open new tab to enjoy!

## Structure

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

## Development

```bash
pnpm install
pnpm run build
```

**Debug**: `about:debugging` → extension console  
**Test**: Load via "Load Temporary Add-on"

## Legal

This is an **unofficial educational project** not affiliated with Google. Art data is accessed through reverse-engineered endpoints and remains property of respective museums and Google Arts & Culture.

## License

MIT License - see [LICENSE](LICENSE) file for details.
