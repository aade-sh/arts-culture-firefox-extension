# Architecture Overview

## Core Design

**Single Manager Pattern**: `ArtManager.instance` handles all art-related operations through a unified interface.

## Key Components

### ArtManager (`js/art-manager.js`)
- **State Management**: Combined state object (provider, index, settings, timestamps)
- **Provider Management**: Registers and switches between art providers
- **Storage**: Unified local storage with consistent naming (`provider:type:key`)
- **Methods**: `syncData()`, `getAsset()`, `loadImage()`, `setCurrentProvider()`, etc.

### ArtProvider Base (`js/providers/art-provider-base.js`)
- **Shared Logic**: Common caching, image loading, and storage patterns
- **Cache Strategy**: 24-hour expiry, consistent across all providers
- **Abstract Methods**: `syncData()`, `getAsset()`, `normalizeAsset()`

### Concrete Providers
- **GoogleArtsProvider**: Fetches from Google Arts & Culture API
- **MetMuseumProvider**: Fetches from Metropolitan Museum API
- **Asset Structure**: `{id, title, creator, attribution, image, link, provider, data_url}`

## Data Flow

1. **Initialization**: `ArtManager` loads state and initializes current provider
2. **Data Sync**: Provider fetches and caches normalized asset data
3. **Asset Access**: Direct calls to `ArtManager.instance.getAsset(index)`
4. **Image Loading**: Shared caching logic handles blob-to-dataURL conversion
5. **State Updates**: All changes go through `ArtManager` and persist to local storage

## Storage Strategy

- **Location**: `chrome.storage.local` only (no sync/local mixing)
- **Format**: Direct values (no unnecessary JSON serialization)
- **Keys**: Structured naming (`provider:cache:assets`, `art_state`)
- **Caching**: 24-hour TTL with timestamp validation

## Benefits

- **50% less code** - Eliminated duplicate logic and proxy layers
- **Single source of truth** - All state managed by `ArtManager`
- **Consistent patterns** - Shared caching and storage across providers  
- **Maintainable** - Clear separation of concerns and unified interfaces