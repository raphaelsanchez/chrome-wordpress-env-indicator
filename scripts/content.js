/**
 * Content script for WordPress Environment Indicator
 * Detects the current environment and injects a badge into the WordPress admin bar
 */

;(function () {
    'use strict'

    /**
     * Main configuration object
     * Contains all constants and configuration values for the extension
     */
    const CONFIG = {
        // Environment detection configuration
        environment: {
            types: {
                development: {
                    type: 'development',
                    name: 'Development',
                    localColor: '#28a745', // Green for localhost
                    tldColor: '#4f39f6', // Blue for TLDs
                },
                staging: {
                    type: 'staging',
                    name: 'Staging',
                    color: '#e60076',
                },
            },
            developmentTlds: ['.dev', '.test', '.local'],
            stagingPatterns: [
                /staging/i,
                /stage/i,
                /preview/i,
                /demo/i,
                /test/i,
            ],
        },

        // Badge and UI configuration
        badge: {
            element: {
                id: 'wp-admin-bar-wp-env-indicator',
                className: 'wp-env-badge',
                role: 'group',
            },
            link: {
                baseClassName: 'ab-item wp-env-badge-link',
                role: 'menuitem',
                href: '#',
            },
            injectionSelectors: [
                '#wp-admin-bar-site-name',
                '#wp-admin-bar-root-default',
                '#wpadminbar .ab-top-menu',
            ],
        },

        // WordPress detection configuration
        wordpress: {
            selectors: {
                adminBar: '#wpadminbar',
                body: '#wpbody',
                content: '#wpcontent',
                footer: '#wpfooter',
                generator: 'meta[name="generator"]',
            },
            bodyClasses: ['wp-admin', 'admin-bar'],
            elementIds: ['#wpbody', '#wpcontent', '#wpfooter'],
            info: {
                patterns: {
                    version: {
                        generator: /WordPress\s+([\d.]+)/,
                        script: /wp-includes\/js\/wp-([\d.]+)\.min\.js/,
                    },
                    theme: {
                        bodyClass: /theme-([a-zA-Z0-9-_]+)/,
                        stylesheet: /themes\/([^\/]+)/,
                    },
                },
                selectors: {
                    generator: 'meta[name="generator"]',
                    scripts: 'script[src*="wp-includes"]',
                    themeStylesheet: 'link[rel="stylesheet"][href*="themes"]',
                },
                defaults: {
                    version: '-',
                    language: '-',
                    theme: '-',
                },
            },
        },
    }

    /**
     * Returns an array of SVG icons for the environment types
     *
     * @returns {Array} Array of SVG icons
     */
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
     * Checks if hostname is a local development environment
     *
     * @param {string} hostname The hostname to check
     * @returns {boolean} True if local development
     */
    function isLocalDevelopment(hostname) {
        return hostname === 'localhost' || hostname.startsWith('127.')
    }

    /**
     * Checks if hostname uses development TLD
     *
     * @param {string} hostname The hostname to check
     * @returns {boolean} True if development TLD
     */
    function isDevelopmentTLD(hostname) {
        return CONFIG.environment.developmentTlds.some((tld) =>
            hostname.endsWith(tld)
        )
    }

    /**
     * Checks if hostname matches staging patterns
     *
     * @param {string} hostname The hostname to check
     * @returns {boolean} True if staging environment
     */
    function isStagingEnvironment(hostname) {
        return CONFIG.environment.stagingPatterns.some((pattern) =>
            pattern.test(hostname)
        )
    }

    /**
     * Gets the appropriate icon for an environment type
     *
     * @param {string} environmentType The environment type
     * @returns {string} The SVG icon
     */
    function getEnvironmentIcon(environmentType) {
        return svgIconsArray().find((icon) => icon.name === environmentType)
            .icon
    }

    /**
     * Creates a development environment object
     *
     * @param {boolean} isLocal Whether it's a local development environment
     * @returns {Object} Development environment configuration
     */
    function createDevelopmentEnvironment(isLocal) {
        const config = CONFIG.environment.types.development
        return {
            type: config.type,
            name: config.name,
            color: isLocal ? config.localColor : config.tldColor,
            icon: getEnvironmentIcon(config.type),
        }
    }

    /**
     * Creates a staging environment object
     *
     * @returns {Object} Staging environment configuration
     */
    function createStagingEnvironment() {
        const config = CONFIG.environment.types.staging
        return {
            type: config.type,
            name: config.name,
            color: config.color,
            icon: getEnvironmentIcon(config.type),
        }
    }

    /**
     * Detects environment type based on hostname
     *
     * @param {string} hostname The hostname to analyze
     * @returns {Object|null} Environment configuration or null
     */
    function detectEnvironmentType(hostname) {
        if (isLocalDevelopment(hostname)) {
            return createDevelopmentEnvironment(true)
        }

        if (isDevelopmentTLD(hostname)) {
            return createDevelopmentEnvironment(false)
        }

        if (isStagingEnvironment(hostname)) {
            return createStagingEnvironment()
        }

        return null
    }

    /**
     * Detects the current environment
     *
     * @description Detects the current environment based on the hostname and protocol
     * @returns {Object|null} The environment object or null for production
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectEnvironment() {
        const hostname = window.location.hostname
        return detectEnvironmentType(hostname)
    }

    /**
     * Checks if WordPress admin bar is present
     *
     * @returns {boolean} True if admin bar is found
     */
    function hasWordPressAdminBar() {
        return (
            document.querySelector(CONFIG.wordpress.selectors.adminBar) !== null
        )
    }

    /**
     * Checks if body has WordPress-specific classes
     *
     * @returns {boolean} True if WordPress classes are found
     */
    function hasWordPressBodyClasses() {
        return CONFIG.wordpress.bodyClasses.some((className) =>
            document.body.classList.contains(className)
        )
    }

    /**
     * Checks if WordPress-specific elements are present
     *
     * @returns {boolean} True if WordPress elements are found
     */
    function hasWordPressElements() {
        return CONFIG.wordpress.elementIds.some(
            (selector) => document.querySelector(selector) !== null
        )
    }

    /**
     * Checks if meta generator tag indicates WordPress
     *
     * @returns {boolean} True if WordPress generator is found
     */
    function hasWordPressGenerator() {
        const generator = document.querySelector(
            CONFIG.wordpress.selectors.generator
        )
        return generator !== null && generator.content.includes('WordPress')
    }

    /**
     * WordPress detection methods in order of reliability
     */
    const WORDPRESS_DETECTION_METHODS = [
        hasWordPressAdminBar,
        hasWordPressBodyClasses,
        hasWordPressElements,
        hasWordPressGenerator,
    ]

    /**
     * Checks if we're on a WordPress site and logged in
     *
     * @returns {boolean} True if we're on a WordPress site, false otherwise
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function isWordPressSite() {
        return WORDPRESS_DETECTION_METHODS.some((method) => method())
    }

    /**
     * Creates the badge container element
     *
     * @returns {HTMLElement} The badge container element
     */
    function createBadgeContainer() {
        const badge = document.createElement('li')
        badge.id = CONFIG.badge.element.id
        badge.className = CONFIG.badge.element.className
        badge.setAttribute('role', CONFIG.badge.element.role)
        return badge
    }

    /**
     * Creates the badge link element
     *
     * @param {Object} environment The environment object
     * @returns {HTMLElement} The badge link element
     */
    function createBadgeLink(environment) {
        const link = document.createElement('a')
        link.className = `${CONFIG.badge.link.baseClassName} wp-env-${environment.type}`
        link.setAttribute('role', CONFIG.badge.link.role)
        link.href = CONFIG.badge.link.href
        return link
    }

    /**
     * Creates the badge text content
     *
     * @param {string} environmentName The environment name
     * @returns {string} The HTML content for the badge text
     */
    function createBadgeText(environmentName) {
        return `<span class="wp-env-text">${environmentName}</span>`
    }

    /**
     * Adds click handler to the badge link
     *
     * @param {HTMLElement} link The link element
     * @returns {void}
     */
    function addBadgeClickHandler(link) {
        link.addEventListener('click', function (e) {
            e.preventDefault()
            chrome.runtime.sendMessage({ action: 'openPopup' })
        })
    }

    /**
     * Creates the environment badge for WordPress admin bar
     *
     * @param {Object} environment The environment object
     * @returns {HTMLElement} The badge element
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function createEnvironmentBadge(environment) {
        const badge = createBadgeContainer()
        const link = createBadgeLink(environment)

        link.innerHTML = createBadgeText(environment.name)
        addBadgeClickHandler(link)

        badge.appendChild(link)
        return badge
    }

    /**
     * Removes existing badge if present
     *
     * @returns {void}
     */
    function removeExistingBadge() {
        const existingBadge = document.getElementById(CONFIG.badge.element.id)
        if (existingBadge) {
            existingBadge.remove()
        }
    }

    /**
     * Validates if badge should be injected
     *
     * @returns {boolean} True if badge should be injected
     */
    function shouldInjectBadge() {
        return isWordPressSite() && detectEnvironment() !== null
    }

    /**
     * Finds the best injection point for the badge
     *
     * @returns {Element|null} The best injection point or null
     */
    function findBadgeInjectionPoint() {
        for (const selector of CONFIG.badge.injectionSelectors) {
            const element = document.querySelector(selector)
            if (element) {
                return element
            }
        }
        return null
    }

    /**
     * Injects badge at the specified element
     *
     * @param {Element} targetElement The target element for injection
     * @param {Element} badge The badge element to inject
     * @returns {void}
     */
    function injectBadgeAtElement(targetElement, badge) {
        if (targetElement.id === 'wp-admin-bar-site-name') {
            // Insert after the site name element
            targetElement.parentNode.insertBefore(
                badge,
                targetElement.nextSibling
            )
        } else {
            // Append to other containers
            targetElement.appendChild(badge)
        }
    }

    /**
     * Stores environment data for popup
     *
     * @param {Object} environment The environment object
     * @returns {void}
     */
    function storeEnvironmentData(environment) {
        chrome.storage.local.set({
            currentEnvironment: environment,
            currentUrl: window.location.href,
            detectedAt: new Date().toISOString(),
        })
    }

    /**
     * Notifies background script about environment change
     *
     * @param {Object} environment The environment object
     * @returns {void}
     */
    function notifyEnvironmentChange(environment) {
        chrome.runtime.sendMessage({
            action: 'environmentUpdated',
            data: environment,
        })
    }

    /**
     * Injects the badge into the WordPress admin bar
     *
     * @returns {void}
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function injectBadge() {
        removeExistingBadge()

        if (!shouldInjectBadge()) {
            return
        }

        const environment = detectEnvironment()
        const badge = createEnvironmentBadge(environment)
        const injectionPoint = findBadgeInjectionPoint()

        if (injectionPoint) {
            injectBadgeAtElement(injectionPoint, badge)
        }

        storeEnvironmentData(environment)
        notifyEnvironmentChange(environment)
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
     * Extracts WordPress version from generator meta tag
     *
     * @returns {string} WordPress version or default value
     */
    function getVersionFromGenerator() {
        const generator = document.querySelector(
            CONFIG.wordpress.info.selectors.generator
        )
        if (generator && generator.content.includes('WordPress')) {
            const match = generator.content.match(
                CONFIG.wordpress.info.patterns.version.generator
            )
            if (match) {
                return match[1]
            }
        }
        return CONFIG.wordpress.info.defaults.version
    }

    /**
     * Extracts WordPress version from script sources
     *
     * @returns {string} WordPress version or default value
     */
    function getVersionFromScripts() {
        const scripts = document.querySelectorAll(
            CONFIG.wordpress.info.selectors.scripts
        )
        for (const script of scripts) {
            const match = script.src.match(
                CONFIG.wordpress.info.patterns.version.script
            )
            if (match) {
                return match[1]
            }
        }
        return CONFIG.wordpress.info.defaults.version
    }

    /**
     * Gets WordPress version using multiple detection methods
     *
     * @returns {string} WordPress version
     */
    function getWordPressVersion() {
        const generatorVersion = getVersionFromGenerator()
        if (generatorVersion !== CONFIG.wordpress.info.defaults.version) {
            return generatorVersion
        }
        return getVersionFromScripts()
    }

    /**
     * Extracts language from HTML element attributes
     *
     * @returns {string} Language code or default value
     */
    function getWordPressLanguage() {
        const html = document.documentElement
        return (
            html.getAttribute('lang') ||
            html.getAttribute('xml:lang') ||
            CONFIG.wordpress.info.defaults.language
        )
    }

    /**
     * Extracts theme name from body classes
     *
     * @returns {string} Theme name or default value
     */
    function getThemeFromBodyClasses() {
        const bodyClasses = document.body.className
        const themeMatch = bodyClasses.match(
            CONFIG.wordpress.info.patterns.theme.bodyClass
        )
        return themeMatch ? themeMatch[1] : CONFIG.wordpress.info.defaults.theme
    }

    /**
     * Extracts theme name from stylesheet links
     *
     * @returns {string} Theme name or default value
     */
    function getThemeFromStylesheets() {
        const themeLink = document.querySelector(
            CONFIG.wordpress.info.selectors.themeStylesheet
        )
        if (themeLink) {
            const themeMatch = themeLink.href.match(
                CONFIG.wordpress.info.patterns.theme.stylesheet
            )
            if (themeMatch) {
                return themeMatch[1]
            }
        }
        return CONFIG.wordpress.info.defaults.theme
    }

    /**
     * Gets WordPress theme using multiple detection methods
     *
     * @returns {string} Theme name
     */
    function getWordPressTheme() {
        const bodyClassTheme = getThemeFromBodyClasses()
        if (bodyClassTheme !== CONFIG.wordpress.info.defaults.theme) {
            return bodyClassTheme
        }
        return getThemeFromStylesheets()
    }

    /**
     * Gets WordPress information (version, language, theme)
     *
     * @returns {Object} WordPress information object
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function getWordPressInfo() {
        return {
            version: getWordPressVersion(),
            language: getWordPressLanguage(),
            theme: getWordPressTheme(),
        }
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
