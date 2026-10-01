/**
 * Automated Tests for Pamborina PWA Install Manager
 */

import { PamborinaPWAInstallManager, BeforeInstallPromptEvent } from '../services/pwaInstallManager';

function createMockPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): {
  event: BeforeInstallPromptEvent;
  promptCalled: boolean;
} {
  let promptCalled = false;
  const event = {
    preventDefault: () => {},
    prompt: async () => {
      promptCalled = true;
    },
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  } as unknown as BeforeInstallPromptEvent;

  return { event, get promptCalled() { return promptCalled; } };
}

async function runTests() {
  console.log('--- STARTING PWA INSTALL MANAGER AUTOMATED AUDIT SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ' - ' + detail : ''}`);
      failed++;
    }
  }

  // TEST 1: beforeinstallprompt arrives -> event saved
  {
    const manager = new PamborinaPWAInstallManager();
    const mock = createMockPromptEvent('accepted');
    manager.__setIsTopLevelForTesting(true);
    manager.__setDeferredPromptForTesting(mock.event);
    assert(manager.isNativePromptAvailable() === true, 'TEST 1: beforeinstallprompt arrives -> event saved');
    assert(manager.getState() === 'installable', 'TEST 1b: State transitions to installable');
  }

  // TEST 2: install button clicked with deferredPrompt -> prompt() called
  {
    const manager = new PamborinaPWAInstallManager();
    const mock = createMockPromptEvent('accepted');
    manager.__setIsTopLevelForTesting(true);
    manager.__setDeferredPromptForTesting(mock.event);
    const result = await manager.executeSmartInstall();
    assert(mock.promptCalled === true, 'TEST 2: install button clicked with deferredPrompt -> prompt() called');
    assert(result.outcome === 'accepted', 'TEST 2b: Execution outcome is accepted');
  }

  // TEST 3: prompt outcome accepted -> does NOT mark INSTALLED prematurely
  {
    const manager = new PamborinaPWAInstallManager();
    const mock = createMockPromptEvent('accepted');
    manager.__setIsTopLevelForTesting(true);
    manager.__setDeferredPromptForTesting(mock.event);
    await manager.executeSmartInstall();
    assert(manager.getState() !== 'installed', 'TEST 3: Strict verification: is NOT installed directly on accepted prompt until appinstalled fires');
  }

  // TEST 4: appinstalled event -> installed
  {
    const manager = new PamborinaPWAInstallManager();
    manager.__simulateAppInstalledForTesting();
    assert(manager.getState() === 'installed', 'TEST 4: appinstalled event -> installed verified');
  }

  // TEST 5: prompt outcome dismissed -> outcome dismissed
  {
    const manager = new PamborinaPWAInstallManager();
    const mock = createMockPromptEvent('dismissed');
    manager.__setIsTopLevelForTesting(true);
    manager.__setDeferredPromptForTesting(mock.event);
    const result = await manager.executeSmartInstall();
    assert(result.outcome === 'dismissed', 'TEST 5: prompt outcome dismissed -> outcome dismissed');
  }

  // TEST 6: deferredPrompt null -> prompt() NOT called
  {
    const manager = new PamborinaPWAInstallManager();
    manager.__setIsTopLevelForTesting(true);
    manager.__setDeferredPromptForTesting(null);
    const result = await manager.executeSmartInstall();
    assert(result.outcome === 'unsupported' || result.outcome === 'manual_required', 'TEST 6: deferredPrompt null -> prompt() NOT called');
  }

  // TEST 7: iframe -> preview_environment
  {
    const manager = new PamborinaPWAInstallManager();
    manager.__setDeferredPromptForTesting(null);
    manager.__setIsTopLevelForTesting(false);
    const result = await manager.executeSmartInstall();
    assert(result.outcome === 'preview_environment', 'TEST 7: iframe context -> preview_environment detected');
  }

  // TEST 8: already standalone -> no install prompt
  {
    const manager = new PamborinaPWAInstallManager();
    manager.__setPlatformDetailsForTesting({
      platform: 'android',
      browser: 'chrome',
      isMobile: true,
      isDesktop: false,
      isChromium: true,
      isIOS: false,
      isAndroid: true,
      isSafari: false,
      isStandalone: true,
      isTopLevel: true,
      supportsNativePrompt: true,
    });
    const result = await manager.executeSmartInstall();
    assert(result.outcome === 'already_installed', 'TEST 8: already standalone -> outcome already_installed');
  }

  // TEST 9: unsupported browser (iOS) -> no fake install, manual_required returned
  {
    const manager = new PamborinaPWAInstallManager();
    manager.__setDeferredPromptForTesting(null);
    manager.__setIsTopLevelForTesting(true);
    manager.__setPlatformDetailsForTesting({
      platform: 'ios',
      browser: 'safari',
      isMobile: true,
      isDesktop: false,
      isChromium: false,
      isIOS: true,
      isAndroid: false,
      isSafari: true,
      isStandalone: false,
      isTopLevel: true,
      supportsNativePrompt: false,
    });
    const result = await manager.executeSmartInstall();
    assert(result.outcome === 'manual_required', 'TEST 9: iOS -> manual_required returned');
    assert(manager.getState() !== 'installed', 'TEST 9b: iOS does NOT report installed');
  }

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
}

runTests();
