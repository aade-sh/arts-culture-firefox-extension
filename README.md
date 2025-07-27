# Google Arts & Culture - Firefox Extension

Firefox port of Google Arts and Culture Chrome Extension.

## Installation

1. Add icons to `icons/` directory (16x16, 32x32, 48x48, 128x128 px)
2. Open Firefox → `about:debugging` → "This Firefox"
3. Click "Load Temporary Add-on" → select `manifest.json`
4. Open new tab to enjoy!

## How it Works

Uses Google Arts & Culture's API (`gstatic.com/culturalinstitute/tabext/imax_2_2.json`) to display the same artworks as the official Chrome extension.

## Structure

```
├── manifest.json          # Extension config
├── js/                    # Core functionality
├── newtab/               # New tab page
├── options/              # Settings page
└── icons/                # Extension icons (need to add)
```

## Development

**Debug**: `about:debugging` → extension console  
**Test**: Load via "Load Temporary Add-on"

## Legal

This is an **unofficial educational project** not affiliated with Google. Art data is accessed through reverse-engineered endpoints and remains property of respective museums and Google Arts & Culture.

## License

MIT License - see [LICENSE](LICENSE) file for details.