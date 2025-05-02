from django.conf import settings


DEFAULT_ADMIN_COLLABORATOR_OPTIONS = {
    "editor_mode_text": "You are in editor mode.",
    "viewer_mode_text": "This page is being edited by {editor_name}. You cannot make changes until they leave.",
    "claiming_editor_text": "The editor has left. The page will refresh shortly to allow editing.",
    "avatar_field": None,
    "notification_request_interval": 15,
    "notification_message": "User {username} is requesting the editors attention.",
    'notification_button_text': 'Request Editor Attention',
    "notification_request_sent_text": "Request sent.",
    # Chat settings
    "enable_chat": True,  # Enable/disable the chat feature
    "chat_user_list_title": "Online Users",  # Title for the user list panel
    "chat_empty_state_text": "No other users online",  # Text when no users are online
    "chat_start_conversation_text": "No messages yet. Start the conversation!",  # Text for empty chat
    "chat_input_placeholder": "Type a message...",  # Placeholder text for chat input field
    "chat_online_status_text": "Online",  # Text for online status indicator
    "chat_offline_status_text": "Offline",  # Text for offline status indicator
    "chat_offline_placeholder": "User is offline. Messages cannot be sent.",  # Placeholder text when user is offline
    "chat_cannot_send_message": "Cannot send message. User is offline.",  # Message shown when trying to send to offline user
}
ADMIN_COLLABORATOR_ADMIN_URL = "admin"
ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL = "admin/collaboration"

def get_admin_collaborator_websocket_connection_prefix_url():
    if hasattr(settings, "ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL"):
        return settings.ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL
    return ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL
