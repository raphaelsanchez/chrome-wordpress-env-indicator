/**
 * Background script for the WordPress Environment Indicator extension
 * Handles extension lifecycle and message routing
 */

// Default colors for different environments
const ENVIRONMENT_COLORS = {
    development: '#28a745', // Green
    staging: '#e60076', // Pink
}

/**
 * Extension installation/update
 *
 * @param {Object} details The details of the installation/update
 * @since 0.1
 * @author Raphael Sanchez <hello@raphaelsanchez.design>
 */
chrome.runtime.onInstalled.addListener(function (details) {
    console.log(
        'WordPress Environment Indicator installed/updated:',
        details.reason
    )

    // Set default settings for future versions
    chrome.storage.local.set({
        version: '0.1',
        installedAt: new Date().toISOString(),
    })
})

/**
 * Handles messages from content scripts and popup
 *
 * @param {Object} request The request object
 * @param {Object} sender The sender object
 * @param {Object} sendResponse The sendResponse object
 * @since 0.1
 * @author Raphael Sanchez <hello@raphaelsanchez.design>
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.action) {
        case 'openPopup':
            // Open the extension popup (this is handled by the browser)
            chrome.action.openPopup()
            break

        case 'environmentUpdated':
            // Forward environment update to popup if it's open
            chrome.runtime.sendMessage({
                action: 'environmentUpdated',
                data: request.data,
            })
            break

        default:
            console.log('Unknown message action:', request.action)
    }

    return true // Keep message channel open for async responses
})

/**
 * Detects environment from URL
 *
 * @param {string} url The URL to analyze
 * @returns {Object|null} Environment object or null
 * @since 0.1
 * @author Raphael Sanchez <hello@raphaelsanchez.design>
 */
function detectEnvironmentFromUrl(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase()

        // Development environment detection patterns
        const developmentPatterns = [
            {
                patterns: ['localhost', '127.'],
                matcher: (host, pattern) =>
                    host === pattern || host.startsWith(pattern),
            },
            {
                patterns: ['.dev', '.test', '.local'],
                matcher: (host, pattern) => host.endsWith(pattern),
            },
        ]
        // Staging environment detection patterns
        const stagingPatterns = [
            {
                patterns: ['staging', 'stage', 'preview', 'demo', 'test'],
                matcher: (host, pattern) => pattern.test(host),
            },
        ]

        // Development environment detection
        for (const { patterns, matcher } of developmentPatterns) {
            if (patterns.some((pattern) => matcher(hostname, pattern))) {
                return {
                    type: 'development',
                    name: 'Development',
                    color: patterns.includes('.dev')
                        ? '#4f39f6'
                        : ENVIRONMENT_COLORS.development,
                }
            }
        }

        // Check for staging patterns
        for (const { patterns, matcher } of stagingPatterns) {
            if (patterns.some((pattern) => matcher(hostname, pattern))) {
                return {
                    type: 'staging',
                    name: 'Staging',
                    color: ENVIRONMENT_COLORS.staging,
                }
            }
        }

        return null // No environment detected
    } catch (error) {
        return null // Invalid URL
    }
}

/**
 * Updates the extension badge for a specific tab
 *
 * @param {number} tabId The tab ID
 * @param {string} url The URL of the tab
 * @since 0.1
 * @author Raphael Sanchez <hello@raphaelsanchez.design>
 */
async function updateExtensionBadge(tabId, url) {
    try {
        const environment = detectEnvironmentFromUrl(url)

        if (environment) {
            // Set badge for detected environment
            chrome.action.setBadgeText({ tabId, text: 'env' })
            chrome.action.setBadgeBackgroundColor({
                tabId,
                color: environment.color,
            })
            chrome.action.setTitle({
                tabId,
                title: `WordPress Environment Indicator - ${environment.name} detected`,
            })
        } else {
            // Clear badge for production or non-WordPress sites
            chrome.action.setBadgeText({ tabId, text: '' })
            chrome.action.setTitle({
                tabId,
                title: 'WordPress Environment Indicator',
            })
        }
    } catch (error) {
        // Invalid URL or other error, clear badge
        chrome.action.setBadgeText({ tabId, text: '' })
    }
}

/**
 * Handles tab updates to refresh environment detection
 *
 * @param {Object} tabId The tab ID
 * @param {Object} changeInfo The change info object
 * @param {Object} tab The tab object
 * @since 0.1
 * @author Raphael Sanchez <hello@raphaelsanchez.design>
 */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // Only process when page is completely loaded
    if (changeInfo.status === 'complete' && tab.url) {
        // Update badge based on URL
        updateExtensionBadge(tabId, tab.url)

        // Inject content script on all pages - it will handle WordPress detection
        chrome.scripting
            .executeScript({
                target: { tabId: tabId },
                files: ['scripts/content.js'],
            })
            .catch((error) => {
                // Script might already be injected, ignore error
                console.log('Content script injection skipped:', error.message)
            })
    }
})

/**
 * Handles tab activation changes
 *
 * @param {Object} activeInfo The active info object
 * @since 0.1
 * @author Raphael Sanchez <hello@raphaelsanchez.design>
 */
chrome.tabs.onActivated.addListener(async function (activeInfo) {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab && tab.url) {
        updateExtensionBadge(activeInfo.tabId, tab.url)
    }
})

/**
 * Handles extension icon click
 *
 * @param {Object} tab The tab object
 * @since 0.1
 * @author Raphael Sanchez <hello@raphaelsanchez.design>
 */
chrome.action.onClicked.addListener(function (tab) {
    // This will open the popup (handled by manifest action)
    console.log('Extension icon clicked on tab:', tab.url)
})
