/**
 * Django Admin Chat
 *
 * This module implements real-time chat between users viewing the same page in Django admin.
 * It allows users to see who else is on the page and chat with them in individual windows.
 */


// Main Chat Manager class
class AdminChatManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.heartbeatInterval = null;
        this.activeUsers = {};  // {user_id: {username, email, avatar_url}}
        this.chatWindows = {};  // {user_id: ChatWindow instance}
        this.isConnected = false;
        this.currentPath = window.location.pathname;
        this.sanitizedPath = this.sanitizePath(this.currentPath);

        // DOM elements
        this.chatContainer = null;
        this.userListContainer = null;
        this.userListPanel = null;
    }

    /**
     * Initialize the chat system
     */
    initialize() {
        // Create and append chat container to the DOM
        this.createChatContainer();

        // Connect to WebSocket
        this.connectWebSocket();

        // Set up heartbeat
        this.startHeartbeat();

        // Handle page navigation/unload
        window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
    }

    /**
     * Sanitize the path for use in WebSocket URL
     * @param {string} path - The page path
     * @returns {string} - Sanitized path
     */
    sanitizePath(path) {
        // Remove leading slash and replace remaining slashes with underscores
        return path.replace(/^\//, '').replace(/\//g, '_');
    }

    /**
     * Create and append the chat UI container to the DOM
     */
    createChatContainer() {
        // Main container for all chat elements
        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'admin-chat-container';
        this.chatContainer.className = 'admin-chat-container';

        // Create user list panel
        this.createUserListPanel();

        // Append to body
        document.body.appendChild(this.chatContainer);
    }

    /**
     * Create the user list panel at the bottom right
     */
    createUserListPanel() {
        // Create user list panel
        this.userListPanel = document.createElement('div');
        this.userListPanel.className = 'admin-chat-user-panel';

        // Panel header with title and toggle button
        const panelHeader = document.createElement('div');
        panelHeader.className = 'admin-chat-panel-header';

        // Add click event to the entire header for toggling
        panelHeader.addEventListener('click', this.toggleUserListPanel.bind(this));

        const panelTitle = document.createElement('span');
        // Use customizable title from settings if available
        panelTitle.textContent = window.ADMIN_COLLABORATOR_CHAT_USER_LIST_TITLE || 'Online Users';
        panelTitle.className = 'admin-chat-panel-title';

        const toggleButton = document.createElement('button');
        toggleButton.className = 'admin-chat-toggle-btn';
        toggleButton.innerHTML = '&#9650;'; // Up arrow
        toggleButton.setAttribute('aria-label', 'Toggle user list');

        // Remove the click handler from the button since we added it to the header
        // This prevents double-toggling when clicking the button

        panelHeader.appendChild(panelTitle);
        panelHeader.appendChild(toggleButton);

        // User list container
        this.userListContainer = document.createElement('div');
        this.userListContainer.className = 'admin-chat-user-list';

        // Add empty state message
        const emptyState = document.createElement('div');
        emptyState.className = 'admin-chat-empty-state';
        emptyState.textContent = window.ADMIN_COLLABORATOR_CHAT_EMPTY_STATE_TEXT || 'No other users online';
        this.userListContainer.appendChild(emptyState);

        // Assemble panel
        this.userListPanel.appendChild(panelHeader);
        this.userListPanel.appendChild(this.userListContainer);

        // Add to chat container
        this.chatContainer.appendChild(this.userListPanel);
    }

    /**
     * Toggle the user list panel visibility
     */
    toggleUserListPanel() {
        this.userListPanel.classList.toggle('collapsed');

        // Update toggle button
        const toggleBtn = this.userListPanel.querySelector('.admin-chat-toggle-btn');
        if (this.userListPanel.classList.contains('collapsed')) {
            toggleBtn.innerHTML = '&#9660;'; // Down arrow
        } else {
            toggleBtn.innerHTML = '&#9650;'; // Up arrow
        }
    }

    /**
     * Connect to the WebSocket server
     */
    connectWebSocket() {
        // Close existing connection if any
        if (this.socket) {
            this.socket.close();
        }

        // Get the WebSocket URL prefix from settings
        const wsPrefix = window.ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL || 'admin/collaboration';

        // Determine protocol (ws or wss) based on current page
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/${wsPrefix}/chat/${this.sanitizedPath}/`;

        // Create WebSocket connection
        this.socket = new WebSocket(wsUrl);

        // Set up event handlers
        this.socket.onopen = this.handleSocketOpen.bind(this);
        this.socket.onmessage = this.handleSocketMessage.bind(this);
        this.socket.onclose = this.handleSocketClose.bind(this);
        this.socket.onerror = this.handleSocketError.bind(this);
    }

    /**
     * Handle WebSocket connection opened
     */
    handleSocketOpen() {
        console.log('Chat WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
    }

    /**
     * Handle incoming WebSocket messages
     * @param {MessageEvent} event - WebSocket message event
     */
    handleSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);

            // Handle different message types
            switch (data.type) {
                case 'active_users':
                    this.handleActiveUsersList(data.users);
                    break;
                case 'user_joined':
                    this.handleUserJoined(data);
                    break;
                case 'user_left':
                    this.handleUserLeft(data);
                    break;
                case 'chat_message':
                    this.handleChatMessage(data);
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Handle WebSocket connection closed
     * @param {CloseEvent} event - WebSocket close event
     */
    handleSocketClose(event) {
        console.log('Chat WebSocket closed', event.code, event.reason);
        this.isConnected = false;

        // Attempt to reconnect unless max attempts reached or page is unloading
        if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isPageUnloading) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            // Exponential backoff for reconnect
            const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
            setTimeout(() => this.connectWebSocket(), backoffTime);
        }
    }

    /**
     * Handle WebSocket errors
     * @param {Event} error - WebSocket error event
     */
    handleSocketError(error) {
        console.error('WebSocket error:', error);
    }

    /**
     * Handle page unload/navigation
     */
    handlePageUnload() {
        this.isPageUnloading = true;

        // Clear intervals
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Close WebSocket
        if (this.socket && this.isConnected) {
            this.socket.close();
        }
    }

    /**
     * Start sending heartbeat messages
     */
    startHeartbeat() {
        // Clear any existing interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Send heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.sendMessage({
                    type: 'heartbeat'
                });
            }
        }, 30000);
    }

    /**
     * Send a message through the WebSocket
     * @param {Object} message - Message to send
     */
    sendMessage(message) {
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify(message));
        }
    }

    /**
     * Handle the active users list
     * @param {Array} users - Array of active user objects
     */
    handleActiveUsersList(users) {
        // Process each user
        users.forEach(user => {
            // Store user data
            this.activeUsers[user.user_id] = {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                avatar_url: user.avatar_url,
                online: true
            };
        });

        // Update UI
        this.updateUserList();
    }

    /**
     * Handle a user joining the chat
     * @param {Object} data - User data
     */
    handleUserJoined(data) {
        // Check if user exists before updating
        const existingUser = this.activeUsers[data.user_id];
        const wasOffline = existingUser && !existingUser.online;

        // Store user data
        this.activeUsers[data.user_id] = {
            user_id: data.user_id,
            username: data.username,
            email: data.username, // Fallback for display
            avatar_url: data.avatar_url,
            online: true
        };

        // Update UI
        this.updateUserList();

        // If there's an open chat window with this user, update it
        if (this.chatWindows[data.user_id]) {
            const chatWindow = this.chatWindows[data.user_id];

            // Update userData property in the chat window to have current status
            chatWindow.userData = this.activeUsers[data.user_id];

            // If user was previously offline, add a system message
            if (wasOffline) {
                chatWindow.addSystemMessage(`${data.username} is now online.`);
            }

            // Update all UI elements based on current status
            this.updateChatWindowStatus(chatWindow);
        }
    }

    /**
     * Handle a user leaving the chat
     * @param {Object} data - User data
     */
    handleUserLeft(data) {
        // Update user status to offline instead of removing them
        if (this.activeUsers[data.user_id]) {
            // Update user data to offline
            this.activeUsers[data.user_id].online = false;

            // Update the user's status in the user list
            const userItem = this.userListContainer.querySelector(`[data-user-id="${data.user_id}"]`);
            if (userItem) {
                const statusIndicator = userItem.querySelector('.admin-chat-status-indicator');
                if (statusIndicator) {
                    statusIndicator.classList.remove('online');
                    statusIndicator.classList.add('offline');
                }

                const onlineStatus = userItem.querySelector('.online-status');
                if (onlineStatus) {
                    onlineStatus.textContent = window.ADMIN_COLLABORATOR_CHAT_OFFLINE_STATUS_TEXT || 'Offline';
                }
            }

            // Update the chat window if open
            if (this.chatWindows[data.user_id]) {
                const chatWindow = this.chatWindows[data.user_id];

                // Update userData property in the chat window
                chatWindow.userData = this.activeUsers[data.user_id];

                // Add a system message indicating the user went offline
                chatWindow.addSystemMessage(`${this.activeUsers[data.user_id].username || this.activeUsers[data.user_id].email} is now offline.`);

                // Update all UI elements based on current status
                this.updateChatWindowStatus(chatWindow);
            }
        } else {
            // If we don't have the user in our active users list, just remove them as before
            delete this.activeUsers[data.user_id];

            // Close chat window if open
            if (this.chatWindows[data.user_id]) {
                this.closeChatWindow(data.user_id);
            }
        }

        // Update UI
        this.updateUserList();
    }

    /**
     * Handle an incoming chat message
     * @param {Object} data - Message data
     */
    handleChatMessage(data) {
        const senderId = data.sender_id;
        const recipientId = data.recipient_id;

        // Check if this message is for the current user (either as sender or recipient)
        if (recipientId !== this.getCurrentUserId() && senderId !== this.getCurrentUserId()) {
            return;
        }

        // Get the other user's ID (the one we're chatting with)
        const otherUserId = senderId === this.getCurrentUserId() ? recipientId : senderId;

        // If we received a message from another user, they must be online
        // Update their status if needed
        if (senderId !== this.getCurrentUserId() && this.activeUsers[senderId]) {
            const wasOffline = this.activeUsers[senderId].online === false;

            // Update to online
            this.activeUsers[senderId].online = true;

            // Update UI if user was previously offline
            if (wasOffline) {
                this.updateUserList();

                // If chat window exists, update its status and add a system message
                if (this.chatWindows[senderId]) {
                    const chatWindow = this.chatWindows[senderId];
                    chatWindow.userData = this.activeUsers[senderId];
                    chatWindow.addSystemMessage(`${this.activeUsers[senderId].username || this.activeUsers[senderId].email} is now online.`);
                    this.updateChatWindowStatus(chatWindow);
                }
            }
        }

        // Open chat window if not already open
        if (!this.chatWindows[otherUserId]) {
            this.openChatWindow(otherUserId);
        } else {
            // Ensure user data and UI are up to date
            const chatWindow = this.chatWindows[otherUserId];
            chatWindow.userData = this.activeUsers[otherUserId];
            this.updateChatWindowStatus(chatWindow);
        }

        // Add message to chat window
        this.chatWindows[otherUserId].addMessage({
            senderId: senderId,
            message: data.message,
            timestamp: data.timestamp
        });
    }

    /**
     * Update the user list UI
     */
    updateUserList() {
        // Clear existing list
        this.userListContainer.innerHTML = '';

        // Check if there are any active users
        if (Object.keys(this.activeUsers).length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'admin-chat-empty-state';
            emptyState.textContent = window.ADMIN_COLLABORATOR_CHAT_EMPTY_STATE_TEXT || 'No other users online';
            this.userListContainer.appendChild(emptyState);
            return;
        }

        // Create user items
        Object.values(this.activeUsers).forEach(user => {
            // Don't show current user in the list
            if (user.user_id !== this.getCurrentUserId()) {
                const userItem = this.createUserItem(user);
                this.userListContainer.appendChild(userItem);
            }
        });
    }

    /**
     * Create a user item for the user list
     * @param {Object} user - User data
     * @returns {HTMLElement} - User item element
     */
    createUserItem(user) {
        const userItem = document.createElement('div');
        userItem.className = 'admin-chat-user-item';
        userItem.dataset.userId = user.user_id;

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'admin-chat-user-avatar';

        if (user.avatar_url) {
            const img = document.createElement('img');
            img.src = user.avatar_url;
            img.alt = user.username || user.email;
            avatar.appendChild(img);
        } else {
            // Use initials if no avatar
            avatar.textContent = this.getUserInitials(user.username || user.email);
        }

        // User info
        const userInfo = document.createElement('div');
        userInfo.className = 'admin-chat-user-info';

        const username = document.createElement('span');
        username.className = 'admin-chat-username';
        username.textContent = user.username || user.email;

        const status = document.createElement('div');
        status.className = 'admin-chat-status';

        const statusIndicator = document.createElement('span');
        statusIndicator.className = `admin-chat-status-indicator ${user.online ? 'online' : 'offline'}`;

        const onlineStatus = document.createElement('span');
        onlineStatus.className = 'online-status';
        onlineStatus.textContent = user.online ?
            (window.ADMIN_COLLABORATOR_CHAT_ONLINE_STATUS_TEXT || 'Online') :
            (window.ADMIN_COLLABORATOR_CHAT_OFFLINE_STATUS_TEXT || 'Offline');

        status.appendChild(statusIndicator);
        status.appendChild(onlineStatus);

        userInfo.appendChild(username);
        userInfo.appendChild(status);

        // Assemble item
        userItem.appendChild(avatar);
        userItem.appendChild(userInfo);

        // Add click event to open chat
        userItem.addEventListener('click', () => this.openChatWindow(user.user_id));

        return userItem;
    }

    /**
     * Get user initials from name or email
     * @param {string} name - User's name or email
     * @returns {string} - User's initials
     */
    getUserInitials(name) {
        if (!name) return '?';

        // If it's an email, use the first character
        if (name.includes('@')) {
            return name.charAt(0).toUpperCase();
        }

        // Otherwise use first characters of each word (max 2)
        const words = name.split(/\s+/);
        if (words.length === 1) {
            return words[0].charAt(0).toUpperCase();
        }

        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }

    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} - Formatted time
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Get current user ID
     * @returns {number} - Current user ID
     */
    getCurrentUserId() {
        return parseInt(document.body.dataset.userId) || null;
    }

    /**
     * Open a chat window with a user
     * @param {number} userId - User ID to chat with
     */
    openChatWindow(userId) {
        // Check if window already exists
        if (this.chatWindows[userId]) {
            // Just focus the window and ensure user data is up to date
            const chatWindow = this.chatWindows[userId];

            // Update user data to ensure it has the latest status
            chatWindow.userData = this.activeUsers[userId];

            // Update UI elements based on current online status
            this.updateChatWindowStatus(chatWindow);

            chatWindow.focus();
            return;
        }

        // Get user data
        const userData = this.activeUsers[userId];
        if (!userData) {
            console.error('User not found:', userId);
            return;
        }

        // Create new chat window
        const chatWindow = new ChatWindow(this, userId, userData);
        this.chatWindows[userId] = chatWindow;

        // Add to container
        this.chatContainer.appendChild(chatWindow.element);
    }

    /**
     * Update chat window status based on user online state
     * @param {ChatWindow} chatWindow - The chat window to update
     */
    updateChatWindowStatus(chatWindow) {
        const userData = chatWindow.userData;
        const isOnline = userData && userData.online !== false;

        // Update header style
        const header = chatWindow.element.querySelector('.admin-chat-window-header');
        if (header) {
            if (isOnline) {
                header.classList.remove('offline-user');
            } else {
                header.classList.add('offline-user');
            }
        }

        // Update input field
        if (chatWindow.inputElement) {
            chatWindow.inputElement.disabled = !isOnline;
            chatWindow.inputElement.placeholder = isOnline
                ? (window.ADMIN_COLLABORATOR_CHAT_INPUT_PLACEHOLDER || 'Type a message...')
                : (window.ADMIN_COLLABORATOR_CHAT_OFFLINE_PLACEHOLDER || 'User is offline. Messages cannot be sent.');
        }

        // Update send button
        const sendBtn = chatWindow.element.querySelector('.admin-chat-send-btn');
        if (sendBtn) {
            sendBtn.disabled = !isOnline;
        }

        // Update status indicator in title
        const windowTitle = chatWindow.element.querySelector('.admin-chat-window-title');
        if (windowTitle) {
            // Remove existing status if any
            const existingStatus = windowTitle.querySelector('.admin-chat-window-status');
            if (existingStatus) {
                existingStatus.remove();
            }

            // Add offline status if user is offline
            if (!isOnline) {
                const status = document.createElement('span');
                status.className = 'admin-chat-window-status';
                status.textContent = window.ADMIN_COLLABORATOR_CHAT_OFFLINE_STATUS_TEXT || 'Offline';
                windowTitle.appendChild(status);
            }
        }
    }

    /**
     * Close a chat window
     * @param {number} userId - User ID
     */
    closeChatWindow(userId) {
        if (this.chatWindows[userId]) {
            // Remove from DOM
            this.chatWindows[userId].element.remove();

            // Remove from windows list
            delete this.chatWindows[userId];
        }
    }
}

/**
 * Chat Window class
 * Represents an individual chat conversation window
 */
class ChatWindow {
    /**
     * Create a new chat window
     * @param {AdminChatManager} manager - Parent chat manager
     * @param {number} userId - User ID of the other person
     * @param {Object} userData - User data
     */
    constructor(manager, userId, userData) {
        this.manager = manager;
        this.userId = userId;
        this.userData = userData;
        this.element = null;
        this.messagesContainer = null;
        this.inputElement = null;
        this.isMinimized = false;

        // Create window
        this.createWindow();
    }

    /**
     * Create the chat window element
     */
    createWindow() {
        // Main window container
        this.element = document.createElement('div');
        this.element.className = 'admin-chat-window';

        // Window header
        const header = document.createElement('div');
        header.className = 'admin-chat-window-header';

        // Add offline class if user is offline
        if (this.userData.online === false) {
            header.classList.add('offline-user');
        }

        // User info in header
        const title = document.createElement('div');
        title.className = 'admin-chat-window-title';

        // User avatar
        const avatar = document.createElement('div');
        avatar.className = 'admin-chat-window-avatar';

        if (this.userData.avatar_url) {
            const img = document.createElement('img');
            img.src = this.userData.avatar_url;
            img.alt = this.userData.username || this.userData.email;
            avatar.appendChild(img);
        } else {
            // Use initials if no avatar
            avatar.textContent = this.manager.getUserInitials(this.userData.username || this.userData.email);
        }

        // Username
        const username = document.createElement('span');
        username.textContent = this.userData.username || this.userData.email;

        title.appendChild(avatar);
        title.appendChild(username);

        // Add online/offline status if needed
        if (this.userData.online === false) {
            const status = document.createElement('span');
            status.className = 'admin-chat-window-status';
            status.textContent = window.ADMIN_COLLABORATOR_CHAT_OFFLINE_STATUS_TEXT || 'Offline';
            title.appendChild(status);
        }

        // Window actions
        const actions = document.createElement('div');
        actions.className = 'admin-chat-window-actions';

        // Minimize button
        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'admin-chat-window-btn';
        minimizeBtn.innerHTML = '&#8211;'; // Minus sign
        minimizeBtn.setAttribute('aria-label', 'Minimize chat window');
        minimizeBtn.addEventListener('click', this.toggleMinimize.bind(this));

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'admin-chat-window-btn';
        closeBtn.innerHTML = '&#10005;'; // X
        closeBtn.setAttribute('aria-label', 'Close chat window');
        closeBtn.addEventListener('click', () => this.manager.closeChatWindow(this.userId));

        actions.appendChild(minimizeBtn);
        actions.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(actions);

        // Add click event to toggle minimize
        header.addEventListener('click', (e) => {
            // Only toggle if clicked directly on header (not on buttons)
            if (e.target === header || e.target === title || e.target === username || e.target === avatar) {
                this.toggleMinimize();
            }
        });

        // Messages container
        this.messagesContainer = document.createElement('div');
        this.messagesContainer.className = 'admin-chat-messages';

        // Empty chat state
        const emptyChat = document.createElement('div');
        emptyChat.className = 'admin-chat-empty';

        const emptyIcon = document.createElement('div');
        emptyIcon.className = 'admin-chat-empty-icon';
        emptyIcon.innerHTML = '&#128172;'; // Speech balloon emoji

        const emptyText = document.createElement('div');
        emptyText.textContent = window.ADMIN_COLLABORATOR_CHAT_START_CONVERSATION_TEXT || 'No messages yet. Start the conversation!';

        emptyChat.appendChild(emptyIcon);
        emptyChat.appendChild(emptyText);

        this.messagesContainer.appendChild(emptyChat);

        // Input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'admin-chat-input-container';

        // Message input
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.className = 'admin-chat-input';
        this.inputElement.placeholder = this.userData.online === false ?
            (window.ADMIN_COLLABORATOR_CHAT_OFFLINE_PLACEHOLDER || 'User is offline. Messages cannot be sent.') :
            (window.ADMIN_COLLABORATOR_CHAT_INPUT_PLACEHOLDER || 'Type a message...');
        this.inputElement.addEventListener('keydown', this.handleInputKeydown.bind(this));

        // Disable input if user is offline
        if (this.userData.online === false) {
            this.inputElement.disabled = true;
        }

        // Send button
        const sendBtn = document.createElement('button');
        sendBtn.className = 'admin-chat-send-btn';
        sendBtn.innerHTML = '&#10148;'; // Right arrow
        sendBtn.setAttribute('aria-label', 'Send message');
        sendBtn.addEventListener('click', this.sendMessage.bind(this));

        // Disable send button if user is offline
        if (this.userData.online === false) {
            sendBtn.disabled = true;
        }

        inputContainer.appendChild(this.inputElement);
        inputContainer.appendChild(sendBtn);

        // Assemble window
        this.element.appendChild(header);
        this.element.appendChild(this.messagesContainer);
        this.element.appendChild(inputContainer);
    }

    /**
     * Toggle minimize state of the window
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.element.classList.toggle('minimized', this.isMinimized);
    }

    /**
     * Focus the chat window
     */
    focus() {
        // Unminimize if minimized
        if (this.isMinimized) {
            this.toggleMinimize();
        }

        // Focus the input field
        this.inputElement.focus();
    }

    /**
     * Handle keydown in the input field
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleInputKeydown(event) {
        // Send message on Enter (not Shift+Enter)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    /**
     * Send a message
     */
    sendMessage() {
        const message = this.inputElement.value.trim();
        if (!message) return;

        // Always check the latest user status from the manager before sending
        const currentUserData = this.manager.activeUsers[this.userId];
        const isOnline = currentUserData && currentUserData.online !== false;

        // Don't allow sending messages to offline users
        if (!isOnline) {
            // Update UI to reflect offline status (in case it wasn't updated)
            this.manager.updateChatWindowStatus(this);

            // Add a system message indicating the user is offline
            this.addSystemMessage(window.ADMIN_COLLABORATOR_CHAT_CANNOT_SEND_MESSAGE || 'Cannot send message. User is offline.');
            return;
        }

        // Clear input
        this.inputElement.value = '';

        // Send message
        this.manager.sendMessage({
            type: 'chat_message',
            recipient_id: this.userId,
            message: message
        });
    }

    /**
     * Add a message to the chat
     * @param {Object} messageData - Message data
     */
    addMessage(messageData) {
        // Remove empty state if present
        const emptyState = this.messagesContainer.querySelector('.admin-chat-empty');
        if (emptyState) {
            emptyState.remove();
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'admin-chat-message';
        messageElement.classList.add(
            messageData.senderId === this.manager.getCurrentUserId() ? 'sent' : 'received'
        );

        // Message text
        const messageText = document.createElement('div');
        messageText.textContent = messageData.message;

        // Message timestamp
        const messageTime = document.createElement('div');
        messageTime.className = 'admin-chat-message-time';
        messageTime.textContent = this.manager.formatTime(messageData.timestamp);

        messageElement.appendChild(messageText);
        messageElement.appendChild(messageTime);

        // Add to container
        this.messagesContainer.appendChild(messageElement);

        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        // Unminimize if minimized
        if (this.isMinimized) {
            this.toggleMinimize();
        }
    }

    /**
     * Add a system message to the chat
     * @param {string} message - System message
     */
    addSystemMessage(message) {
        // Remove empty state if present
        const emptyState = this.messagesContainer.querySelector('.admin-chat-empty');
        if (emptyState) {
            emptyState.remove();
        }

        // Create system message element
        const systemMessage = document.createElement('div');
        systemMessage.className = 'admin-chat-system-message';
        systemMessage.textContent = message;

        // Add to container
        this.messagesContainer.appendChild(systemMessage);

        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize chat when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    const adminUrl = window.ADMIN_COLLABORATOR_ADMIN_URL; // default: 'admin'
    const adminMatch = path.match(new RegExp(`/${adminUrl}/(\\w+)/(\\w+)/(\\d+)/change/?`));
    if (!adminMatch) {
        // If we're not on a change page, try to match a detail page without /change/
        const detailMatch = path.match(new RegExp(`/${adminUrl}/(\\w+)/(\\w+)/(\\d+)/?`));
        if (!detailMatch) {
            return
        }
    }

    // Only initialize on admin pages
    if (!document.querySelector('#user-tools') && !document.querySelector('.admin-title')) {
        return;
    }

    // Check if chat is enabled
    if (typeof window.ADMIN_COLLABORATOR_ENABLE_CHAT !== 'undefined' &&
        window.ADMIN_COLLABORATOR_ENABLE_CHAT === false) {
        return;
    }

    // Add user ID to body if not present
    if (!document.body.dataset.userId) {
        // Try to get user ID from user tools
        const userTools = document.querySelector('#user-tools');
        if (userTools) {
            // Extract user ID from a data attribute or other method
            // This might need customization based on your setup
            document.body.dataset.userId = userTools.dataset.userId || '0';
        }
    }

    // Initialize chat manager
    const chatManager = new AdminChatManager();
    chatManager.initialize();
});
