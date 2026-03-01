import { ProviderName } from '../types'
import {
  ArtUpdatedMessage,
  ExtensionMessage,
  RuntimeMessageType,
  SettingsUpdatedMessage,
} from '../types/runtime-messages'
import { artService } from './container'

chrome.runtime.onInstalled.addListener(() => {
  void handleInstalled()
})

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  void handleExtensionMessage(message, sender)
  return false
})

async function handleInstalled(): Promise<void> {
  try {
    await artService.handleInstalled()
  } catch (error) {
    console.error('Error during extension setup:', error)
  }
}

async function handleExtensionMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  switch (message.type) {
    case RuntimeMessageType.INITIALIZE_ART: {
      const tabId = sender.tab?.id
      if (!tabId) {
        return
      }

      try {
        const response = await artService.initializeArt()
        chrome.tabs.sendMessage(tabId, {
          type: RuntimeMessageType.INITIALIZE_ART_RESPONSE,
          data: response,
        })
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : 'Unknown error'
        console.error('Error initializing art:', error)
        chrome.tabs.sendMessage(tabId, {
          type: RuntimeMessageType.INITIALIZE_ART_RESPONSE,
          data: { error: 'Failed to load artwork: ' + messageText },
        })
      }
      return
    }

    case RuntimeMessageType.ROTATE_TO_NEXT:
      await handleRotateToNext()
      return

    case RuntimeMessageType.SWITCH_PROVIDER:
      await handleSwitchProvider(message.provider)
      return

    case RuntimeMessageType.SET_TURNOVER_ALWAYS:
      await handleSetTurnoverAlways(message.turnoverAlwaysEnabled)
      return
  }
}

async function handleRotateToNext(): Promise<void> {
  try {
    const message = await artService.rotateToNext()
    if (message) {
      broadcastToNewTabPages(message)
    }
  } catch (error) {
    console.error('Error rotating to next:', error)
  }
}

async function handleSwitchProvider(providerName: ProviderName): Promise<void> {
  try {
    const message = await artService.switchProvider(providerName)
    if (message) {
      broadcastToNewTabPages(message)
    }
  } catch (error) {
    console.error('Error switching provider:', error)
  }
}

async function handleSetTurnoverAlways(
  turnoverAlwaysEnabled: boolean,
): Promise<void> {
  try {
    const message = await artService.setTurnoverAlways(turnoverAlwaysEnabled)
    broadcastToNewTabPages(message)
  } catch (error) {
    console.error('Error updating turnover setting:', error)
  }
}

function broadcastToNewTabPages(
  message: ArtUpdatedMessage | SettingsUpdatedMessage,
): void {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url?.includes('newtab')) {
        chrome.tabs.sendMessage(tab.id, message)
      }
    })
  })
}
