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
                            if (chrome.runtime.lastError || !response) {
                                // Fallback: try to detect from current tab
                                detectWordPressInfoFromTab(tabs[0].id)
                            } else {
                                elements.wpVersion.textContent =
                                    response.version || '-'
                                elements.wpLanguage.textContent =
                                    response.language || '-'
                                elements.currentTheme.textContent =
                                    response.theme || '-'
                            }
                        }
                    )
                } else {
                    elements.wpVersion.textContent = '-'
                    elements.wpLanguage.textContent = '-'
                    elements.currentTheme.textContent = '-'
                }
            }
        )
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

            let environment = null

            // Check for localhost or 127.x.x.x
            if (hostname === 'localhost' || hostname.startsWith('127.')) {
                environment = {
                    type: 'development',
                    name: 'Development',
                    color: '#28a745',
                }
            }
            // Check for development TLDs
            else if (
                hostname.endsWith('.dev') ||
                hostname.endsWith('.test') ||
                hostname.endsWith('.local')
            ) {
                environment = {
                    type: 'development',
                    name: 'Development',
                    color: '#28a745',
                }
            }
            // Check for staging patterns
            else {
                const stagingPatterns = [
                    /staging/i,
                    /stage/i,
                    /preview/i,
                    /demo/i,
                    /test/i,
                ]

                for (const pattern of stagingPatterns) {
                    if (pattern.test(hostname)) {
                        environment = {
                            type: 'staging',
                            name: 'Staging',
                            color: '#ffc107',
                        }
                        break
                    }
                }
            }

            // Update display with detected environment or show no data
            if (environment) {
                currentEnvironment = environment
                updateEnvironmentDisplay()
            } else {
                showNoDataState()
            }
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
