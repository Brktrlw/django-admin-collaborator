/**
 * Django Admin Collaborative Editor
 *
 * This module implements real-time collaboration for Django admin change forms.
 * It allows multiple users to see who is editing a page and prevents concurrent edits.
 */


// Main initialization function - runs when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on admin change forms
    if (!isAdminChangeForm()) return;

    // Extract relevant information from the URL
    const pathInfo = extractPathInfo();
    if (!pathInfo) return;

    // Initialize the collaborative editor with path information
    const collaborativeEditor = new CollaborativeEditor(pathInfo);
    collaborativeEditor.initialize();
});

/**
 * Check if the current page is a Django admin change form
 * @returns {boolean} True if on an admin change form, false otherwise
 */
function isAdminChangeForm() {
    return document.getElementById('content-main') &&
           document.querySelector('.change-form');
}

/**
 * Extract app, model, and object ID from the URL path
 * @returns {Object|null} Object containing appLabel, modelName, and objectId, or null if not found
 */
function extractPathInfo() {
    const path = window.location.pathname;
    const adminUrl = window.ADMIN_COLLABORATOR_ADMIN_URL; // default: 'admin'
    
    const adminMatch = path.match(new RegExp(`/${adminUrl}/(\\w+)/(\\w+)/(\\d+)/change/?`));

    if (!adminMatch) {
        // If we're not on a change page, try to match a detail page without /change/
        const detailMatch = path.match(new RegExp(`/${adminUrl}/(\\w+)/(\\w+)/(\\d+)/?`));
        if (detailMatch) {
            return {
                appLabel: detailMatch[1],
                modelName: detailMatch[2],
                objectId: detailMatch[3]
            };
        }
        return null;
    }

    return {
        appLabel: adminMatch[1],
        modelName: adminMatch[2],
        objectId: adminMatch[3]
    };
}

/**
 * UI Manager class
 * Responsible for all DOM manipulations and UI updates
 */
class UIManager {
    constructor() {
        this.warningBanner = this.createWarningBanner();
        this.userAvatarsContainer = this.createUserAvatarsContainer();
        document.body.appendChild(this.warningBanner);
        document.body.appendChild(this.userAvatarsContainer);
    }

    /**
     * Create the warning banner element
     * @returns {HTMLElement} The created warning banner
     */
    createWarningBanner() {
        const banner = document.createElement('div');
        banner.id = 'edit-lock-warning';
        banner.style.display = 'none';
        banner.style.padding = '15px';
        banner.style.margin = '0';
        banner.style.fontSize = '15px';
        banner.style.fontWeight = 'bold';
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.zIndex = '1000';
        banner.style.textAlign = 'center';
        banner.style.color = '#721c24';
        banner.style.backgroundColor = '#f8d7da';
        banner.style.borderBottom = '1px solid #f5c6cb';
        return banner;
    }

    /**
     * Create the user avatars container element
     * @returns {HTMLElement} The created avatars container
     */
    createUserAvatarsContainer() {
        const container = document.createElement('div');
        container.id = 'user-avatars-container';
        container.style.position = 'fixed';
        container.style.top = '5px';
        container.style.right = '10px';
        container.style.zIndex = '1001';
        container.style.display = 'flex';
        container.style.flexDirection = 'row-reverse'; // Right to left
        container.style.gap = '5px';
        return container;
    }

    /**
     * Show a warning message to the user
     * @param {string} message - The message to display
     */
    showWarningMessage(message) {
        this.warningBanner.textContent = message;
        this.warningBanner.style.display = 'block';
        this.warningBanner.style.backgroundColor = '#f8d7da';
        this.warningBanner.style.color = '#721c24';
        this.warningBanner.style.borderBottom = '1px solid #f5c6cb';

        // Adjust body padding to prevent content from being hidden under the warning
        document.body.style.paddingTop = this.warningBanner.offsetHeight + 'px';
    }

    /**
     * Show a success message to the user
     * @param {string} message - The message to display
     */
    showSuccessMessage(message) {
        this.warningBanner.textContent = message;
        this.warningBanner.style.display = 'block';
        this.warningBanner.style.backgroundColor = '#d4edda';
        this.warningBanner.style.color = '#155724';
        this.warningBanner.style.borderBottom = '1px solid #c3e6cb';

        // Adjust body padding to prevent content from being hidden under the warning
        document.body.style.paddingTop = this.warningBanner.offsetHeight + 'px';
    }

    /**
     * Hide the warning message
     */
    hideWarningMessage() {
        this.warningBanner.style.display = 'none';
        document.body.style.paddingTop = '0';
    }

    /**
     * Add a user avatar to the container
     * @param {string} userId - The user's ID
     * @param {string} username - The user's username
     * @param {string} email - The user's email
     * @param {boolean} isEditor - Whether this user is the current editor
     */
    addUserAvatar(userId, username, email, isEditor) {
        // Check if avatar already exists
        if (document.getElementById(`user-avatar-${userId}`)) {
            return;
        }

        // Create avatar element
        const avatar = document.createElement('div');
        avatar.id = `user-avatar-${userId}`;
        avatar.className = 'user-avatar';
        avatar.setAttribute('data-user-id', userId);
        avatar.setAttribute('title', username);

        // Avatar styling
        avatar.style.width = '36px';
        avatar.style.height = '36px';
        avatar.style.borderRadius = '50%';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.fontWeight = 'bold';
        avatar.style.fontSize = '16px';
        avatar.style.color = '#fff';
        avatar.style.textTransform = 'uppercase';
        avatar.style.position = 'relative';

        // Set background color based on editor status
        this.updateAvatarStyle(avatar, isEditor);

        // Add first letter of username
        avatar.textContent = username.charAt(0);

        // Create and append tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'avatar-tooltip';
        tooltip.textContent = username;
        tooltip.style.position = 'absolute';
        tooltip.style.bottom = '-30px';
        tooltip.style.right = '0';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '5px 10px';
        tooltip.style.borderRadius = '3px';
        tooltip.style.fontSize = '12px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.display = 'none';
        tooltip.style.zIndex = '1002';

        avatar.appendChild(tooltip);

        // Show/hide tooltip on hover
        avatar.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });

        avatar.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        // Add avatar to container
        this.userAvatarsContainer.appendChild(avatar);
    }

    /**
     * Remove a user's avatar from the container
     * @param {string} userId - The ID of the user whose avatar to remove
     */
    removeUserAvatar(userId) {
        const userAvatar = document.getElementById(`user-avatar-${userId}`);
        if (userAvatar) {
            userAvatar.remove();
        }
    }

    /**
     * Update the styling of an avatar based on editor status
     * @param {HTMLElement} avatar - The avatar element to update
     * @param {boolean} isEditor - Whether this user is the current editor
     */
    updateAvatarStyle(avatar, isEditor) {
        if (isEditor) {
            avatar.style.backgroundColor = '#28a745'; // Green for editor
            avatar.style.border = '2px solid #20c997';
        } else {
            avatar.style.backgroundColor = '#007bff'; // Blue for viewers
            avatar.style.border = '2px solid #0056b3';
        }
    }

    /**
     * Update all avatars to reflect the current editor
     * @param {string} editorId - The ID of the current editor
     */
    updateAllAvatars(editorId) {
        document.querySelectorAll('.user-avatar').forEach(avatar => {
            const userId = avatar.getAttribute('data-user-id');
            this.updateAvatarStyle(avatar, userId == editorId);
        });
    }

    /**
     * Disable the form to prevent editing
     */
    disableForm() {
        const form = document.querySelector('#content-main form');
        if (!form) return;

        // Disable form elements
        const elements = form.querySelectorAll('input, select, textarea, button');
        elements.forEach(element => {
            element.disabled = true;
            element.style.opacity = '0.7';
            element.style.cursor = 'not-allowed';
        });

        // Hide submit row
        const submitRow = document.querySelector('.submit-row');
        if (submitRow) {
            submitRow.style.display = 'none';
        }

        // Disable admin links
        document.querySelectorAll('a.addlink, a.changelink, a.deletelink').forEach(link => {
            link.style.pointerEvents = 'none';
            link.style.opacity = '0.5';
        });
    }

    /**
     * Enable the form for editing
     * @param {Function} submitCallback - Callback for form submission
     * @param {Function} saveCallback - Callback for save button clicks
     */
    enableForm(submitCallback, saveCallback) {
        const form = document.querySelector('#content-main form');
        if (!form) return;

        // Enable form elements
        const elements = form.querySelectorAll('input, select, textarea, button');
        elements.forEach(element => {
            element.disabled = false;
            element.style.opacity = '';
            element.style.cursor = '';
        });

        // Show submit row
        const submitRow = document.querySelector('.submit-row');
        if (submitRow) {
            submitRow.style.display = 'flex';
        }

        // Enable admin links
        document.querySelectorAll('a.addlink, a.changelink, a.deletelink').forEach(link => {
            link.style.pointerEvents = '';
            link.style.opacity = '';
        });

        // Add form submission handler
        form.addEventListener('submit', submitCallback);

        // Add save button handlers
        const saveButtons = document.querySelectorAll('input[name="_continue"], input[name="_save"]');
        saveButtons.forEach(button => {
            button.addEventListener('click', saveCallback);
        });
    }
}

/**
 * WebSocket Communication Manager
 * Responsible for handling all WebSocket communications
 */
class WebSocketManager {
    /**
     * @param {Object} pathInfo - Object containing appLabel, modelName, and objectId
     * @param {Object} handlers - Event handler functions
     */
    constructor(pathInfo, handlers) {
        this.pathInfo = pathInfo;
        this.handlers = handlers;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.MAX_RECONNECT_ATTEMPTS = 5;
        this.isNavigatingAway = false;
    }

    /**
     * Connect to the WebSocket server
     */
    connect() {
        if (this.socket) {
            // Close existing socket properly
            this.socket.onclose = null; // Remove reconnect logic
            this.socket.close();
        }

        const base_part = location.hostname + (location.port ? ':' + location.port : '');
        const { appLabel, modelName, objectId } = this.pathInfo;
        let wssSource = `/admin/collaboration/${appLabel}/${modelName}/${objectId}/`;

        if (location.protocol === 'https:') {
            wssSource = "wss://" + base_part + wssSource;
        } else if (location.protocol === 'http:') {
            wssSource = "ws://" + base_part + wssSource;
        }

        this.socket = new WebSocket(wssSource);
        this.setupEventHandlers();
    }

    /**
     * Set up WebSocket event handlers
     */
    setupEventHandlers() {
        this.socket.onopen = () => {
            console.log('WebSocket connection established');
            this.reconnectAttempts = 0; // Reset counter on successful connection
        };

        this.socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            this.handleMessage(data);
        };

        this.socket.onclose = (e) => {
            console.log('WebSocket connection closed');

            // Try to reconnect if not deliberately closed
            if (!this.isNavigatingAway && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                this.attemptReconnect();
            } else if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
                if (this.handlers.onMaxReconnectAttemptsReached) {
                    this.handlers.onMaxReconnectAttemptsReached();
                }
            }
        };

        this.socket.onerror = (e) => {
            console.error('WebSocket error:', e);
        };
    }

    /**
     * Handle incoming WebSocket messages
     * @param {Object} data - The parsed message data
     */
    handleMessage(data) {
        switch (data.type) {
            case 'user_joined':
                if (this.handlers.onUserJoined) {
                    this.handlers.onUserJoined(data);
                }
                break;
            case 'user_left':
                if (this.handlers.onUserLeft) {
                    this.handlers.onUserLeft(data);
                }
                break;
            case 'editor_status':
                if (this.handlers.onEditorStatus) {
                    this.handlers.onEditorStatus(data);
                }
                break;
            case 'content_updated':
                if (this.handlers.onContentUpdated) {
                    this.handlers.onContentUpdated(data);
                }
                break;
            case 'lock_released':
                if (this.handlers.onLockReleased) {
                    this.handlers.onLockReleased(data);
                }
                break;
        }
    }

    /**
     * Attempt to reconnect to the WebSocket server
     */
    attemptReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff with 30s max

        if (this.handlers.onReconnectAttempt) {
            this.handlers.onReconnectAttempt(this.reconnectAttempts);
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(() => this.connect(), delay);
    }

    /**
     * Send a message to the WebSocket server
     * @param {Object} message - The message to send
     */
    sendMessage(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    /**
     * Request the current editor status
     */
    requestEditorStatus() {
        this.sendMessage({
            'type': 'request_editor_status',
            'timestamp': getUTCTimestamp()
        });
    }

    /**
     * Claim editor status
     */
    claimEditor() {
        this.sendMessage({
            'type': 'claim_editor',
            'timestamp': getUTCTimestamp()
        });
    }

    /**
     * Send a content updated notification
     */
    notifyContentUpdated() {
        this.sendMessage({
            'type': 'content_updated',
            'timestamp': getUTCTimestamp()
        });
    }

    /**
     * Release the editing lock
     */
    releaseLock() {
        this.isNavigatingAway = true;
        this.sendMessage({
            'type': 'release_lock'
        });
    }

    /**
     * Send a heartbeat message to maintain editor status
     */
    sendHeartbeat() {
        this.sendMessage({
            'type': 'heartbeat'
        });
    }

    /**
     * Cleanup resources before page unload
     */
    cleanup() {
        this.isNavigatingAway = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            this.socket.onclose = null; // Remove reconnect logic
            this.socket.close();
        }
    }
}

/**
 * Main Collaborative Editor class
 * Coordinates communication and UI updates
 */
class CollaborativeEditor {
    /**
     * @param {Object} pathInfo - Object containing appLabel, modelName, and objectId
     */
    constructor(pathInfo) {
        this.pathInfo = pathInfo;
        this.uiManager = new UIManager();

        // State variables
        this.myUserId = null;
        this.myUsername = null;
        this.currentEditor = null;
        this.currentEditorName = null;
        this.lastModifiedTimestamp = null;
        this.canEdit = false;
        this.joinTimestamp = null;
        this.activeUsers = {}; // Stores {id: {username, email}}
        this.refreshTimer = null;
        this.heartbeatInterval = null;

        // Create WebSocket manager with handlers
        this.wsManager = new WebSocketManager(pathInfo, {
            onUserJoined: this.handleUserJoined.bind(this),
            onUserLeft: this.handleUserLeft.bind(this),
            onEditorStatus: this.handleEditorStatus.bind(this),
            onContentUpdated: this.handleContentUpdated.bind(this),
            onLockReleased: this.handleLockReleased.bind(this),
            onReconnectAttempt: this.handleReconnectAttempt.bind(this),
            onMaxReconnectAttemptsReached: this.handleMaxReconnectAttemptsReached.bind(this)
        });
    }

    /**
     * Initialize the collaborative editor
     */
    initialize() {
        // Connect to WebSocket
        this.wsManager.connect();

        // Set up page unload handler
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        // Start heartbeat for maintaining editor status
        this.startHeartbeat();
    }

    /**
     * Start heartbeat interval to maintain editor status
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.canEdit) {
                this.wsManager.sendHeartbeat();
            }
        }, 30000); // Send heartbeat every 30 seconds
    }

    /**
     * Handle a user joining the session
     * @param {Object} data - User joined message data
     */
    handleUserJoined(data) {
        if (!this.myUserId) {
            // This is our own join message
            this.myUserId = data.user_id;
            this.myUsername = data.username;
            this.joinTimestamp = new Date(data.timestamp);
            this.lastModifiedTimestamp = data.last_modified;

            // Request current editor status
            this.wsManager.requestEditorStatus();
        } else if (data.user_id !== this.myUserId) {
            // Another user joined
            this.activeUsers[data.user_id] = {
                username: data.username,
                email: data.email
            };

            // Add avatar for the new user
            this.uiManager.addUserAvatar(
                data.user_id,
                data.username,
                data.email,
                data.user_id === this.currentEditor
            );
        }
    }

    /**
     * Handle a user leaving the session
     * @param {Object} data - User left message data
     */
    handleUserLeft(data) {
        if (data.user_id in this.activeUsers) {
            delete this.activeUsers[data.user_id];
            this.uiManager.removeUserAvatar(data.user_id);
        }

        if (data.user_id === this.currentEditor && this.currentEditor !== this.myUserId) {
            this.uiManager.showWarningMessage(window.ADMIN_COLLABORATOR_CLAIMING_EDITOR_TEXT);
            this.scheduleRefresh();
        }
    }

    /**
     * Handle editor status update
     * @param {Object} data - Editor status message data
     */
    handleEditorStatus(data) {
        this.currentEditor = data.editor_id;
        this.currentEditorName = data.editor_name;

        // Update avatars to reflect editor status
        this.uiManager.updateAllAvatars(this.currentEditor);

        if (this.currentEditor === this.myUserId) {
            // We are the editor
            this.canEdit = true;
            this.uiManager.showSuccessMessage(window.ADMIN_COLLABORATOR_EDITOR_MODE_TEXT);
            this.uiManager.enableForm(
                // Submit callback
                () => this.wsManager.notifyContentUpdated(),
                // Save button callback
                () => this.wsManager.releaseLock()
            );
        } else if (this.currentEditor) {
            // Someone else is editing
            this.canEdit = false;
            let viewerModeText = window.ADMIN_COLLABORATOR_VIEWER_MODE_TEXT
            viewerModeText = viewerModeText.replace('{editor_name}', data.editor_name);
            this.uiManager.showWarningMessage(viewerModeText);
            this.uiManager.disableForm();
        } else {
            // No editor, try to claim editor status
            this.wsManager.claimEditor();
        }
    }

    /**
     * Handle content updated message
     * @param {Object} data - Content updated message data
     */
    handleContentUpdated(data) {
        if (this.currentEditor !== this.myUserId) {
            this.uiManager.showWarningMessage('The content has been updated. The page will refresh shortly.');

            if (!this.lastModifiedTimestamp || isTimeAfter(data.timestamp, this.lastModifiedTimestamp)) {
                this.lastModifiedTimestamp = data.timestamp;
                this.scheduleRefresh();
            }
        }
    }

    /**
     * Handle lock released message
     * @param {Object} data - Lock released message data
     */
    handleLockReleased(data) {
        if (this.currentEditor !== this.myUserId) {
            this.uiManager.showWarningMessage('The editor has finished editing. The page will refresh to allow you to edit.');
            this.scheduleRefresh();
        }
    }

    /**
     * Handle reconnection attempt
     * @param {number} attemptNumber - The current reconnection attempt number
     */
    handleReconnectAttempt(attemptNumber) {
        this.uiManager.showWarningMessage(`Connection lost. Trying to reconnect... (Attempt ${attemptNumber})`);
    }

    /**
     * Handle reaching maximum reconnection attempts
     */
    handleMaxReconnectAttemptsReached() {
        this.uiManager.showWarningMessage('Connection lost. Please refresh the page manually.');
    }

    /**
     * Schedule a page refresh
     */
    scheduleRefresh() {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    /**
     * Handle the page being unloaded
     */
    handleBeforeUnload() {
        // Clean up resources
        clearInterval(this.heartbeatInterval);
        clearTimeout(this.refreshTimer);

        // Release lock if we're the editor
        if (this.canEdit) {
            this.wsManager.releaseLock();
        }

        // Clean up WebSocket
        this.wsManager.cleanup();
    }
}

/**
 * Helper function to get UTC ISO timestamp
 * @returns {string} Current UTC timestamp in ISO format
 */
function getUTCTimestamp() {
    return new Date().toISOString();
}

/**
 * Helper function to compare timestamps
 * @param {string} time1 - First timestamp to compare
 * @param {string} time2 - Second timestamp to compare
 * @returns {boolean} True if time1 is later than time2
 */
function isTimeAfter(time1, time2) {
    return new Date(time1) > new Date(time2);
}