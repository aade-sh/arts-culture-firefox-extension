# Architecture Overview

## Core Design

**Single Manager Pattern**: `ArtManager` coordinates all art operations.

## Components

### ArtManager (`src/background/art-manager.ts`)
- Central coordinator for providers and state
- Manages provider switching and asset access

### Providers
- **Interface**: `ArtProvider` contract
- **Base Class**: Shared functionality for caching and HTTP
- **Implementations**: `GoogleArtsProvider`, `MetMuseumProvider`

## Data Flow

1. Initialize manager, register providers
2. Operations route through current provider
3. State persists automatically

## Storage

- Extension storage with consistent key naming
- Provider-level caching