/**
 * Popup script for WordPress Environment Indicator
 * Handles the popup interface and communication with content script
 */

;(function () {
    'use strict'

    // DOM elements
    const elements = {
        environmentCard: document.getElementById('environment-card'),
        environmentIndicator: document.getElementById('environment-indicator'),
        environmentName: document.getElementById('environment-name'),
        wpVersion: document.getElementById('wp-version'),
        wpLanguage: document.getElementById('wp-language'),
        currentTheme: document.getElementById('current-theme'),
        tabButtons: document.querySelectorAll('.tabs__button'),
        tabPanels: document.querySelectorAll('.tabs__panel'),
    }

    // Environment data
    let currentEnvironment = null

    /**
     * Environment configuration constants
     */
    const ENVIRONMENT_CONFIG = {
        development: {
            type: 'development',
            name: 'Development',
            color: '#28a745',
        },
        staging: {
            type: 'staging',
            name: 'Staging',
            color: '#ffc107',
        },
    }

    /**
     * Development TLD patterns
     */
    const DEVELOPMENT_TLDS = ['.dev', '.test', '.local']

    /**
     * Staging hostname patterns
     */
    const STAGING_PATTERNS = [
        /staging/i,
        /stage/i,
        /preview/i,
        /demo/i,
        /test/i,
    ]

    /**
     * Initializes the popup
     *
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function init() {
        loadEnvironmentData()
        setupEventListeners()
        setupFooterData()
    }

    /**
     * Sets up the footer data
     *
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function setupFooterData() {
        const date = document.querySelector('.footer-info__date')
        const version = document.querySelector('.app-version')
        const author = document.querySelector('.footer-info__author')
        const github = document.querySelector('.footer-info__link')

        date.textContent = new Date().getFullYear()
        version.textContent = `v.${chrome.runtime.getManifest().version}`
        author.textContent = chrome.runtime.getManifest().author
        github.href = chrome.runtime.getManifest().homepage_url
    }

    /**
     * Sets up the event listeners
     *
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function setupEventListeners() {
        // Tab switching
        elements.tabButtons.forEach((button) => {
            button.addEventListener('click', function () {
                if (this.disabled) return
                switchTab(this.dataset.tab)
            })
        })
    }

    /**
     * Switches between tabs
     *
     * @param {string} tabName The name of the tab to switch to
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function switchTab(tabName) {
        // Update tab buttons
        elements.tabButtons.forEach((btn) => {
            btn.classList.remove('tabs__button--active')
            if (btn.dataset.tab === tabName) {
                btn.classList.add('tabs__button--active')
            }
        })

        // Update tab panels
        elements.tabPanels.forEach((panel) => {
            panel.classList.remove('tabs__panel--active')
            if (panel.id === `${tabName}-tab`) {
                panel.classList.add('tabs__panel--active')
            }
        })
    }

    /**
     * Loads the environment data from storage
     *
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function loadEnvironmentData() {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                if (tabs[0] && tabs[0].url) {
                    detectEnvironmentInPopup(tabs[0].url)
                } else {
                    showNoDataState()
                }
            }
        )
    }

    /**
     * Updates the environment display
     *
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function updateEnvironmentDisplay() {
        if (!currentEnvironment) {
            showNoDataState()
            return
        }

        // Update environment card
        elements.environmentCard.className = `environment__card environment__card--${currentEnvironment.type}`
        elements.environmentIndicator.className = `environment__indicator environment__indicator--${currentEnvironment.type}`
        elements.environmentName.textContent = currentEnvironment.name

        // Detect WordPress version and language
        detectWordPressInfo()
    }

    /**
     * Shows the no data state
     *
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function showNoDataState() {
        elements.environmentCard.className = 'environment__card'
        elements.environmentIndicator.className = 'environment__indicator'
        elements.environmentName.textContent = 'Aucune donnée'

        elements.wpVersion.textContent = '-'
        elements.wpLanguage.textContent = '-'
        elements.currentTheme.textContent = '-'
    }

    /**
     * Handles WordPress info response from content script
     *
     * @param {Object} response The response from content script
     * @param {string} tabId The tab ID for fallback
     */
    function handleWordPressInfoResponse(response, tabId) {
        if (chrome.runtime.lastError || !response) {
            // Fallback: try to detect from current tab
            detectWordPressInfoFromTab(tabId)
        } else {
            updateWordPressInfoElements(response)
        }
    }

    /**
     * Sets default WordPress info when no tab is available
     */
    function setDefaultWordPressInfo() {
        updateWordPressInfoElements({
            version: '-',
            language: '-',
            theme: '-',
        })
    }

    /**
     * Detects the WordPress version and language
     *
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectWordPressInfo() {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                if (tabs[0] && tabs[0].url) {
                    // Send message to content script to get WordPress info
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        { action: 'getWordPressInfo' },
                        function (response) {
                            handleWordPressInfoResponse(response, tabs[0].id)
                        }
                    )
                } else {
                    setDefaultWordPressInfo()
                }
            }
        )
    }

    /**
     * Extracts WordPress version from generator meta tag
     *
     * @returns {string} WordPress version or default value
     */
    function getVersionFromGenerator() {
        const generator = document.querySelector(
            CONFIG.wordpress.selectors.generator
        )
        if (generator && generator.content.includes('WordPress')) {
            const match = generator.content.match(
                CONFIG.wordpress.patterns.version.generator
            )
            if (match) {
                return match[1]
            }
        }
        return CONFIG.wordpress.defaults.version
    }

    /**
     * Extracts WordPress version from script sources
     *
     * @returns {string} WordPress version or default value
     */
    function getVersionFromScripts() {
        const scripts = document.querySelectorAll(
            CONFIG.wordpress.selectors.scripts
        )
        for (const script of scripts) {
            const match = script.src.match(
                CONFIG.wordpress.patterns.version.script
            )
            if (match) {
                return match[1]
            }
        }
        return CONFIG.wordpress.defaults.version
    }

    /**
     * Gets WordPress version using multiple detection methods
     *
     * @returns {string} WordPress version
     */
    function getWordPressVersion() {
        const generatorVersion = getVersionFromGenerator()
        if (generatorVersion !== CONFIG.wordpress.defaults.version) {
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
            CONFIG.wordpress.defaults.language
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
            CONFIG.wordpress.patterns.theme.bodyClass
        )
        return themeMatch ? themeMatch[1] : CONFIG.wordpress.defaults.theme
    }

    /**
     * Extracts theme name from stylesheet links
     *
     * @returns {string} Theme name or default value
     */
    function getThemeFromStylesheets() {
        const themeLink = document.querySelector(
            CONFIG.wordpress.selectors.themeStylesheet
        )
        if (themeLink) {
            const themeMatch = themeLink.href.match(
                CONFIG.wordpress.patterns.theme.stylesheet
            )
            if (themeMatch) {
                return themeMatch[1]
            }
        }
        return CONFIG.wordpress.defaults.theme
    }

    /**
     * Gets WordPress theme using multiple detection methods
     *
     * @returns {string} Theme name
     */
    function getWordPressTheme() {
        const bodyClassTheme = getThemeFromBodyClasses()
        if (bodyClassTheme !== CONFIG.wordpress.defaults.theme) {
            return bodyClassTheme
        }
        return getThemeFromStylesheets()
    }

    /**
     * Update WordPress info elements in popup
     *
     * @param {Object} wpInfo WordPress information object
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function updateWordPressInfoElements(wpInfo) {
        elements.wpVersion.textContent = wpInfo.version || '-'
        elements.wpLanguage.textContent = wpInfo.language || '-'
        elements.currentTheme.textContent = wpInfo.theme || '-'
    }

    /**
     * Detect WordPress version from meta generator tag
     *
     * @returns {string} WordPress version or '-'
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectWordPressVersionFromGenerator() {
        const generator = document.querySelector('meta[name="generator"]')
        if (generator && generator.content.includes('WordPress')) {
            const match = generator.content.match(/WordPress\s+([\d.]+)/)
            if (match) {
                return match[1]
            }
        }
        return '-'
    }

    /**
     * Detect WordPress version from wp-includes scripts
     *
     * @returns {string} WordPress version or '-'
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectWordPressVersionFromScripts() {
        const scripts = document.querySelectorAll('script[src*="wp-includes"]')
        for (const script of scripts) {
            const match = script.src.match(
                /wp-includes\/js\/wp-([\d.]+)\.min\.js/
            )
            if (match) {
                return match[1]
            }
        }
        return '-'
    }

    /**
     * Detect WordPress version using multiple methods
     *
     * @returns {string} WordPress version or '-'
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectWordPressVersion() {
        let version = detectWordPressVersionFromGenerator()
        if (version === '-') {
            version = detectWordPressVersionFromScripts()
        }
        return version
    }

    /**
     * Detect page language
     *
     * @returns {string} Language code or '-'
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectPageLanguage() {
        const html = document.documentElement
        return html.getAttribute('lang') || html.getAttribute('xml:lang') || '-'
    }

    /**
     * Detect theme from body classes
     *
     * @returns {string} Theme name or null
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectThemeFromBodyClasses() {
        const bodyClasses = document.body.className
        const themeMatch = bodyClasses.match(/theme-([a-zA-Z0-9-_]+)/)
        return themeMatch ? themeMatch[1] : null
    }

    /**
     * Detect theme from stylesheet links
     *
     * @returns {string} Theme name or null
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectThemeFromStylesheets() {
        const themeLink = document.querySelector(
            'link[rel="stylesheet"][href*="themes"]'
        )
        if (themeLink) {
            const href = themeLink.href
            const themeMatch = href.match(/themes\/([^\/]+)/)
            return themeMatch ? themeMatch[1] : null
        }
        return null
    }

    /**
     * Detect WordPress theme using multiple methods
     *
     * @returns {string} Theme name or '-'
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectWordPressTheme() {
        let theme = detectThemeFromBodyClasses()
        if (!theme) {
            theme = detectThemeFromStylesheets()
        }
        return theme || '-'
    }

    /**
     * Fallback WordPress info detection
     *
     * @param {string} tabId The ID of the tab
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectWordPressInfoFromTab(tabId) {
        chrome.scripting.executeScript(
            {
                target: { tabId: tabId },
                func: function () {
                    return {
                        version: detectWordPressVersion(),
                        language: detectPageLanguage(),
                        theme: detectWordPressTheme(),
                    }
                },
            },
            function (results) {
                if (results && results[0] && results[0].result) {
                    updateWordPressInfoElements(results[0].result)
                } else {
                    updateWordPressInfoElements({
                        version: '-',
                        language: '-',
                        theme: '-',
                    })
                }
            }
        )
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
        return DEVELOPMENT_TLDS.some((tld) => hostname.endsWith(tld))
    }

    /**
     * Checks if hostname matches staging patterns
     *
     * @param {string} hostname The hostname to check
     * @returns {boolean} True if staging environment
     */
    function isStagingEnvironment(hostname) {
        return STAGING_PATTERNS.some((pattern) => pattern.test(hostname))
    }

    /**
     * Detects environment type based on hostname
     *
     * @param {string} hostname The hostname to analyze
     * @returns {Object|null} Environment configuration or null
     */
    function detectEnvironmentType(hostname) {
        if (isLocalDevelopment(hostname) || isDevelopmentTLD(hostname)) {
            return ENVIRONMENT_CONFIG.development
        }

        if (isStagingEnvironment(hostname)) {
            return ENVIRONMENT_CONFIG.staging
        }

        return null
    }

    /**
     * Updates UI based on detected environment
     *
     * @param {Object|null} environment Environment configuration or null
     */
    function updateEnvironmentUI(environment) {
        if (environment) {
            currentEnvironment = environment
            updateEnvironmentDisplay()
        } else {
            showNoDataState()
        }
    }

    /**
     * Fallback environment detection in popup
     *
     * @param {string} url The URL of the tab
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    function detectEnvironmentInPopup(url) {
        try {
            const urlObj = new URL(url)
            const hostname = urlObj.hostname

            const environment = detectEnvironmentType(hostname)
            updateEnvironmentUI(environment)
        } catch (error) {
            console.log('Error detecting environment:', error)
            showNoDataState()
        }
    }

    /**
     * Listens for messages from content script
     *
     * @param {Object} request The request object
     * @param {Object} sender The sender object
     * @param {Object} sendResponse The sendResponse object
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    chrome.runtime.onMessage.addListener(function (
        request,
        sender,
        sendResponse
    ) {
        if (request.action === 'environmentUpdated') {
            loadEnvironmentData()
        }
    })

    /**
     * Initializes when DOM is ready
     *
     * @since 0.1
     * @author Raphael Sanchez <hello@raphaelsanchez.design>
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init)
    } else {
        init()
    }
})()
