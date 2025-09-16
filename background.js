/**
 * Background script for the WordPress Environment Indicator extension
 * Handles extension lifecycle and message routing
 */

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
