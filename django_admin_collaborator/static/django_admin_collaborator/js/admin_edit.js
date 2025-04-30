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
        this.notificationContainer = this.createNotificationContainer();
        document.body.appendChild(this.warningBanner);
        document.body.appendChild(this.userAvatarsContainer);
        document.body.appendChild(this.notificationContainer);
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
     * Create the notification container for editor attention requests
     * @returns {HTMLElement} The created notification container
     */
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'attention-notification-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.left = '20px';
        container.style.zIndex = '1002';
        container.style.borderRadius = '10px';
        container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        container.style.color = '#333';
        container.style.padding = '16px';
        container.style.fontSize = '14px';
        container.style.fontFamily = 'system-ui, sans-serif';
        container.style.maxWidth = '320px';
        container.style.display = 'none';
        container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
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
     * @param {string|null} avatarUrl - URL of the user's avatar image, if available
     */
    addUserAvatar(userId, username, email, isEditor, avatarUrl) {
        // Check if avatar already exists
        if (document.getElementById(`user-avatar-${userId}`)) {
            return;
        }

        // Create avatar container
        const avatarContainer = document.createElement('div');
        avatarContainer.id = `user-avatar-container-${userId}`;
        avatarContainer.style.position = 'relative';
        avatarContainer.style.display = 'inline-block';

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
        avatar.style.overflow = 'hidden';

        // Set background color based on editor status
        this.updateAvatarStyle(avatar, isEditor);

        if (avatarUrl) {
            // Create and add image element
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            avatar.appendChild(img);
        } else {
            // Add first letter of username as fallback
            avatar.textContent = username.charAt(0);
        }

        // Create and append tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'avatar-tooltip';

        // Create tooltip content with username and email
        const tooltipContent = document.createElement('div');
        tooltipContent.style.display = 'flex';
        tooltipContent.style.flexDirection = 'column';
        tooltipContent.style.gap = '4px';

        // Add username
        const usernameElement = document.createElement('div');
        usernameElement.textContent = username;
        usernameElement.style.fontWeight = 'bold';
        usernameElement.style.fontSize = '14px';

        // Add email if available
        if (email) {
            const emailElement = document.createElement('div');
            emailElement.textContent = email;
            emailElement.style.fontSize = '12px';
            emailElement.style.color = '#e0e0e0';
            tooltipContent.appendChild(emailElement);
        }

        tooltipContent.insertBefore(usernameElement, tooltipContent.firstChild);
        tooltip.appendChild(tooltipContent);

        // Tooltip styling
        tooltip.style.position = 'absolute';
        tooltip.style.top = '100%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.marginTop = '8px';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.display = 'none';
        tooltip.style.zIndex = '1002';
        tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

        // Add a small arrow to the tooltip
        const arrow = document.createElement('div');
        arrow.style.position = 'absolute';
        arrow.style.top = '-6px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.width = '0';
        arrow.style.height = '0';
        arrow.style.borderLeft = '6px solid transparent';
        arrow.style.borderRight = '6px solid transparent';
        arrow.style.borderBottom = '6px solid rgba(0, 0, 0, 0.8)';
        tooltip.appendChild(arrow);

        avatarContainer.appendChild(avatar);
        avatarContainer.appendChild(tooltip);

        // Show/hide tooltip on hover
        avatarContainer.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });

        avatarContainer.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        // Add avatar container to the main container
        this.userAvatarsContainer.appendChild(avatarContainer);
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

    /**
     * Show attention request notification
     * @param {string} username - Username of the requester
     */
    showAttentionNotification(username) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'attention-notification';

        // Style the notification
        notification.style.backgroundColor = '#f8f9fa';
        notification.style.border = '1px solid #dee2e6';
        notification.style.borderLeft = '4px solid #007bff';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.15)';
        notification.style.padding = '12px 15px';
        notification.style.marginBottom = '10px';
        notification.style.position = 'relative';
        notification.style.animation = 'fadeIn 0.3s ease-in-out';

        // Create message with the configured text
        let message = window.ADMIN_COLLABORATOR_NOTIFICATION_MESSAGE || 'User {username} is requesting the editors attention.';
        message = message.replace('{username}', username);

        notification.textContent = message;

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.border = 'none';
        closeButton.style.background = 'none';
        closeButton.style.fontSize = '16px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = '#6c757d';

        closeButton.addEventListener('click', () => {
            notification.remove();

            // Hide container if empty
            if (!this.notificationContainer.children.length) {
                this.notificationContainer.style.display = 'none';
            }
        });

        notification.appendChild(closeButton);

        // Add to container
        this.notificationContainer.style.display = 'block';
        this.notificationContainer.appendChild(notification);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode === this.notificationContainer) {
                notification.remove();

                // Hide container if empty
                if (!this.notificationContainer.children.length) {
                    this.notificationContainer.style.display = 'none';
                }
            }
        }, 10000);
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
        this.MAX_RECONNECT_ATTEMPTS = 2;
        this.isNavigatingAway = false;
        this.wasDisconnected = false; // Track if there was a disconnect
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

        const { appLabel, modelName, objectId } = this.pathInfo;
        const base_part = window.location.host;
        let wssSource = `/${window.ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL}/${appLabel}/${modelName}/${objectId}/`;

        if (window.location.protocol === "https:") {
            wssSource = "wss://" + base_part + wssSource;
        } else {
            wssSource = "ws://" + base_part + wssSource;
        }

        this.socket = new WebSocket(wssSource);
        this.setupEventHandlers();

        // Set a connection timeout - if the connection doesn't open within 5 seconds, try again
        this.connectionTimeout = setTimeout(() => {
            if (this.socket.readyState !== WebSocket.OPEN) {
                this.socket.close();
                this.attemptReconnect();
            }
        }, 5000);
    }

    /**
     * Set up WebSocket event handlers
     */
    setupEventHandlers() {
        this.socket.onopen = () => {
            console.log('WebSocket connection established');

            // Clear connection timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            // If this was a reconnection, notify handlers
            if (this.wasDisconnected && this.reconnectAttempts > 0) {
                if (this.handlers.onReconnectSuccess) {
                    this.handlers.onReconnectSuccess();
                }
            }

            this.reconnectAttempts = 0; // Reset counter on successful connection
            this.wasDisconnected = false; // Reset disconnect flag
        };

        this.socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            this.handleMessage(data);
        };

        this.socket.onclose = (e) => {
            console.log('WebSocket connection closed');
            this.wasDisconnected = true; // Set disconnect flag

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
            case 'attention_requested':
                if (this.handlers.onAttentionRequested) {
                    this.handlers.onAttentionRequested(data);
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
     * Request the editor's attention
     */
    requestAttention() {
        this.sendMessage({
            'type': 'request_attention',
            'timestamp': getUTCTimestamp()
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
        this.lastAttentionRequestTime = 0; // Track when last attention request was sent
        this.wasDisconnected = false; // Track if we were previously disconnected
        this.wasEditor = false; // Track if we were previously the editor

        // Create WebSocket manager with handlers
        this.wsManager = new WebSocketManager(pathInfo, {
            onUserJoined: this.handleUserJoined.bind(this),
            onUserLeft: this.handleUserLeft.bind(this),
            onEditorStatus: this.handleEditorStatus.bind(this),
            onContentUpdated: this.handleContentUpdated.bind(this),
            onLockReleased: this.handleLockReleased.bind(this),
            onReconnectAttempt: this.handleReconnectAttempt.bind(this),
            onMaxReconnectAttemptsReached: this.handleMaxReconnectAttemptsReached.bind(this),
            onReconnectSuccess: this.handleReconnectSuccess.bind(this),
            onAttentionRequested: this.handleAttentionRequested.bind(this)
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
        // Send the first heartbeat immediately if we become the editor
        if (this.canEdit) {
            this.wsManager.sendHeartbeat();
        }

        // Clear any existing heartbeat interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Set up more frequent heartbeats to maintain editor status
        this.heartbeatInterval = setInterval(() => {
            if (this.canEdit) {
                console.log('Sending editor heartbeat');
                this.wsManager.sendHeartbeat();
            }
        }, 15000); // Send heartbeat every 15 seconds (reduced from 30s)
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
                data.user_id === this.currentEditor,
                data.avatar_url
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
            this.wasEditor = true; // Update wasEditor flag for reconnection purposes
            this.uiManager.showSuccessMessage(window.ADMIN_COLLABORATOR_EDITOR_MODE_TEXT);
            this.uiManager.enableForm(
                // Submit callback
                () => this.wsManager.notifyContentUpdated(),
                // Save button callback
                () => this.wsManager.releaseLock()
            );

            // Restart heartbeat interval with the updated canEdit value
            this.startHeartbeat();
        } else if (this.currentEditor) {
            // Someone else is editing
            this.canEdit = false;
            let viewerModeText = window.ADMIN_COLLABORATOR_VIEWER_MODE_TEXT
            viewerModeText = viewerModeText.replace('{editor_name}', data.editor_name);
            this.uiManager.showWarningMessage(viewerModeText);
            this.uiManager.disableForm();
            // Add attention request button for viewers
            this.addAttentionRequestButton();
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
     * Handle attention requested message
     * @param {Object} data - Attention requested message data
     */
    handleAttentionRequested(data) {
        // Only show notification if we're the current editor
        if (this.currentEditor === this.myUserId) {
            this.uiManager.showAttentionNotification(data.username);
        }
    }

    /**
     * Handle reconnection attempt
     * @param {number} attemptNumber - The current reconnection attempt number
     */
    handleReconnectAttempt(attemptNumber) {
        this.wasDisconnected = true;
        this.uiManager.showWarningMessage(`Connection lost. Trying to reconnect... (Attempt ${attemptNumber})`);
    }

    /**
     * Handle successful reconnection
     */
    handleReconnectSuccess() {
        this.wasDisconnected = false;

        // If we were previously the editor, make multiple attempts to reclaim editor status
        if (this.wasEditor) {
            console.log('Attempting to reclaim editor status after reconnection');

            // First attempt immediately
            this.wsManager.claimEditor();

            // Additional attempts with increasing delays to account for backend processing
            // This helps in case of race conditions with other clients
            setTimeout(() => {
                if (this.currentEditor !== this.myUserId) {
                    console.log('Retry #1 to reclaim editor status');
                    this.wsManager.claimEditor();
                }
            }, 1000);

            setTimeout(() => {
                if (this.currentEditor !== this.myUserId) {
                    console.log('Retry #2 to reclaim editor status');
                    this.wsManager.claimEditor();
                }
            }, 3000);
        }

        // Re-request editor status to get back in sync
        this.wsManager.requestEditorStatus();

        // Directly restore the appropriate message based on current editor status
        if (this.currentEditor === this.myUserId) {
            // We are the editor
            this.uiManager.showSuccessMessage(window.ADMIN_COLLABORATOR_EDITOR_MODE_TEXT);
        } else if (this.currentEditor) {
            // Someone else is editing
            let viewerModeText = window.ADMIN_COLLABORATOR_VIEWER_MODE_TEXT;
            viewerModeText = viewerModeText.replace('{editor_name}', this.currentEditorName);
            this.uiManager.showWarningMessage(viewerModeText);
        } else {
            // No editor currently assigned, we'll wait for the requestEditorStatus response
            // Clear any warning messages in the meantime
            this.uiManager.hideWarningMessage();
        }
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

        // If we're the editor, update the wasEditor flag for potential reconnection
        if (this.canEdit && this.currentEditor === this.myUserId) {
            this.wasEditor = true;
        }

        // Release lock if we're the editor
        if (this.canEdit) {
            this.wsManager.releaseLock();
        }

        // Clean up WebSocket
        this.wsManager.cleanup();
    }

    /**
     * Add a button for viewers to request the editor's attention
     */
    addAttentionRequestButton() {
        // Check if button already exists
        if (document.getElementById('request-attention-button')) {
            return;
        }

        // Create button container - add to warning banner
        const warningBanner = document.getElementById('edit-lock-warning');
        if (!warningBanner) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '8px';

        const requestButton = document.createElement('button');
        requestButton.id = 'request-attention-button';
        requestButton.textContent = window.ADMIN_COLLABORATOR_NOTIFICATION_BUTTON_TEXT;

        requestButton.style.padding = '10px 20px';
        requestButton.style.background = 'linear-gradient(135deg, #6c63ff, #3f3d56)';
        requestButton.style.color = '#fff';
        requestButton.style.border = 'none';
        requestButton.style.borderRadius = '8px';
        requestButton.style.cursor = 'pointer';
        requestButton.style.fontSize = '15px';
        requestButton.style.fontWeight = '600';
        requestButton.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
        requestButton.style.transition = 'all 0.3s ease';

        requestButton.addEventListener('mouseenter', () => {
            requestButton.style.transform = 'translateY(-2px)';
            requestButton.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.2)';
        });

        requestButton.addEventListener('mouseleave', () => {
            requestButton.style.transform = 'translateY(0)';
            requestButton.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
        });

        // Set up the click handler with rate limiting
        requestButton.addEventListener('click', () => {
            const now = Date.now();
            const interval = (window.ADMIN_COLLABORATOR_NOTIFICATION_INTERVAL || 15) * 1000; // Convert to milliseconds

            if (now - this.lastAttentionRequestTime < interval) {
                // Too soon to request again
                const remainingSeconds = Math.ceil((interval - (now - this.lastAttentionRequestTime)) / 1000);

                // Show temporary message on the button
                const originalText = requestButton.textContent;
                requestButton.textContent = `Wait ${remainingSeconds}s`;
                requestButton.disabled = true;
                requestButton.style.opacity = '0.7';

                // Reset the button after a short delay
                setTimeout(() => {
                    requestButton.textContent = originalText;
                    requestButton.disabled = false;
                    requestButton.style.opacity = '1';
                }, 2000);

                return;
            }

            // Update last request time
            this.lastAttentionRequestTime = now;

            // Send the attention request
            this.wsManager.requestAttention();

            // Provide feedback
            const originalText = requestButton.textContent;
            requestButton.textContent = window.ADMIN_COLLABORATOR_NOTIFICATION_REQUEST_SENT_TEXT;
            requestButton.disabled = true;
            requestButton.style.opacity = '0.7';

            // Reset the button after interval expires
            setTimeout(() => {
                requestButton.textContent = originalText;
                requestButton.disabled = false;
                requestButton.style.opacity = '1';
            }, interval);
        });

        buttonContainer.appendChild(requestButton);
        warningBanner.appendChild(buttonContainer);
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
