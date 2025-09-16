/**
 * Content script for WordPress Environment Indicator
 * Detects the current environment and injects a badge into the WordPress admin bar
 */

;(function () {
    'use strict'

    function svgIconsArray() {
        return [
            {
                name: 'development',
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
            },
            {
                name: 'staging',
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
            },
        ]
    }

    /**
     * Detects the current environment
     *
     * @description Detects the current environment based on the hostname and protocol
     * @returns {Object} The environment object
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectEnvironment() {
        const hostname = window.location.hostname
        const protocol = window.location.protocol

        // Check for localhost or 127.x.x.x
        if (hostname === 'localhost' || hostname.startsWith('127.')) {
            return {
                type: 'development',
                name: 'Development',
                color: '#28a745', // Green
                icon: svgIconsArray().find(
                    (icon) => icon.name === 'development'
                ).icon,
            }
        }

        // Check for development TLDs
        if (
            hostname.endsWith('.dev') ||
            hostname.endsWith('.test') ||
            hostname.endsWith('.local')
        ) {
            return {
                type: 'development',
                name: 'Development',
                color: '#4f39f6',
                icon: svgIconsArray().find(
                    (icon) => icon.name === 'development'
                ).icon,
            }
        }

        // Check for staging patterns (common patterns)
        const stagingPatterns = [
            /staging/i,
            /stage/i,
            /preview/i,
            /demo/i,
            /test/i,
        ]

        for (const pattern of stagingPatterns) {
            if (pattern.test(hostname)) {
                return {
                    type: 'staging',
                    name: 'Staging',
                    color: '#e60076',
                    icon: svgIconsArray().find(
                        (icon) => icon.name === 'staging'
                    ).icon,
                }
            }
        }

        // No badge for production
        return null
    }

    /**
     * Checks if we're on a WordPress site and logged in
     *
     * @returns {boolean} True if we're on a WordPress site, false otherwise
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function isWordPressSite() {
        // Primary detection: WordPress admin bar
        if (
            document.querySelector('#wpadminbar') !== null &&
            document.querySelector('#wpadminbar') !== null
        ) {
            return true
        }

        // Secondary detection: body classes
        if (
            document.body.classList.contains('wp-admin') ||
            document.body.classList.contains('admin-bar')
        ) {
            return true
        }

        // Tertiary detection: WordPress-specific elements
        if (
            document.querySelector('#wpbody') !== null ||
            document.querySelector('#wpcontent') !== null ||
            document.querySelector('#wpfooter') !== null
        ) {
            return true
        }

        // Fallback: meta generator tag
        if (
            document.querySelector('meta[name="generator"]') !== null &&
            document
                .querySelector('meta[name="generator"]')
                .content.includes('WordPress')
        ) {
            return true
        }

        return false
    }

    /**
     * Creates the environment badge for WordPress admin bar
     *
     * @param {Object} environment The environment object
     * @returns {Object} The badge element
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function createEnvironmentBadge(environment) {
        const badge = document.createElement('li')
        badge.id = 'wp-admin-bar-wp-env-indicator'
        badge.className = 'wp-env-badge'
        badge.setAttribute('role', 'group')

        const link = document.createElement('a')
        link.className = `ab-item wp-env-badge-link wp-env-${environment.type}`
        link.setAttribute('role', 'menuitem')
        link.href = '#'
        link.innerHTML = `
            <span class="wp-env-text">${environment.name}</span>
        `

        // Click handler to show extension popup
        link.addEventListener('click', function (e) {
            e.preventDefault()
            chrome.runtime.sendMessage({ action: 'openPopup' })
        })

        badge.appendChild(link)
        return badge
    }

    /**
     * Injects the badge into the WordPress admin bar
     *
     * @returns {void}
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function injectBadge() {
        // Remove existing badge if any
        const existingBadge = document.getElementById(
            'wp-admin-bar-wp-env-indicator'
        )
        if (existingBadge) {
            existingBadge.remove()
        }

        // Only inject if we're on a WordPress site
        if (!isWordPressSite()) {
            return
        }

        const environment = detectEnvironment()

        // Only inject badge for development and staging
        if (!environment) {
            return
        }

        const badge = createEnvironmentBadge(environment)

        // Find the site name element and inject the badge after it
        const siteNameElement = document.getElementById(
            'wp-admin-bar-site-name'
        )
        if (siteNameElement) {
            // Insert after the site name element
            siteNameElement.parentNode.insertBefore(
                badge,
                siteNameElement.nextSibling
            )
        } else {
            // Fallback: try to find the admin bar root
            const adminBarRoot = document.getElementById(
                'wp-admin-bar-root-default'
            )
            if (adminBarRoot) {
                adminBarRoot.appendChild(badge)
            } else {
                // Last fallback: try to find any admin bar container
                const adminBar = document.querySelector(
                    '#wpadminbar .ab-top-menu'
                )
                if (adminBar) {
                    adminBar.appendChild(badge)
                }
            }
        }

        // Store environment info for popup
        chrome.storage.local.set({
            currentEnvironment: environment,
            currentUrl: window.location.href,
            detectedAt: new Date().toISOString(),
        })

        // Notify background script about environment change
        chrome.runtime.sendMessage({
            action: 'environmentUpdated',
            data: environment,
        })
    }

    /**
     * Initializes the extension
     *
     * @returns {void}
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectBadge)
        } else {
            injectBadge()
        }

        // Re-inject on navigation (for SPA-like behavior)
        let lastUrl = window.location.href
        new MutationObserver(() => {
            const currentUrl = window.location.href
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl
                setTimeout(injectBadge, 100) // Small delay to ensure DOM is updated
            }
        }).observe(document, { subtree: true, childList: true })
    }

    /**
     * Listens for messages from popup
     *
     * @returns {void}
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    chrome.runtime.onMessage.addListener(function (
        request,
        sender,
        sendResponse
    ) {
        if (request.action === 'refresh') {
            // Re-run environment detection
            injectBadge()
            sendResponse({ success: true })
        } else if (request.action === 'getWordPressInfo') {
            // Get WordPress version, language and theme
            const wpInfo = getWordPressInfo()
            sendResponse(wpInfo)
        }
        return true
    })

    /**
     * Gets WordPress version, language and theme
     *
     * @returns {Object} The WordPress info object
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function getWordPressInfo() {
        let version = '-'
        let language = '-'
        let theme = '-'

        // Check meta generator tag
        const generator = document.querySelector('meta[name="generator"]')
        if (generator && generator.content.includes('WordPress')) {
            const match = generator.content.match(/WordPress\s+([\d.]+)/)
            if (match) {
                version = match[1]
            }
        }

        // Check for wp-includes version in scripts
        if (version === '-') {
            const scripts = document.querySelectorAll(
                'script[src*="wp-includes"]'
            )
            for (const script of scripts) {
                const match = script.src.match(
                    /wp-includes\/js\/wp-([\d.]+)\.min\.js/
                )
                if (match) {
                    version = match[1]
                    break
                }
            }
        }

        // Check for language
        const html = document.documentElement
        language =
            html.getAttribute('lang') || html.getAttribute('xml:lang') || '-'

        // Check for theme name in body classes
        const bodyClasses = document.body.className
        const themeMatch = bodyClasses.match(/theme-([a-zA-Z0-9-_]+)/)
        if (themeMatch) {
            theme = themeMatch[1]
        } else {
            // Try to get theme from wp_head
            const themeLink = document.querySelector(
                'link[rel="stylesheet"][href*="themes"]'
            )
            if (themeLink) {
                const href = themeLink.href
                const themeMatch = href.match(/themes\/([^\/]+)/)
                if (themeMatch) {
                    theme = themeMatch[1]
                }
            }
        }

        return { version, language, theme }
    }

    /**
     * Starts the extension
     *
     * @returns {void}
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    init()
})()
