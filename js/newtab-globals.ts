import { instance as ArtManager } from './art-manager.js';
import { NewTabSetting } from './settings.js';

// Make ArtManager and settings globally available for the new tab page
(globalThis as any).ArtManager = { instance: ArtManager };
(globalThis as any).NewTabSetting = NewTabSetting;