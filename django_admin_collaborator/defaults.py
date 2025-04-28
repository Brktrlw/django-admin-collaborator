from django.conf import settings


DEFAULT_ADMIN_COLLABORATOR_OPTIONS = {
    "editor_mode_text": "You are in editor mode.",
    "viewer_mode_text": "This page is being edited by {editor_name}. You cannot make changes until they leave.",
    "claiming_editor_text": "The editor has left. The page will refresh shortly to allow editing.",
    "avatar_field": None,
    "notification_request_interval": 15,
    "notification_message": "User {username} is requesting the editors attention.",
    'notification_button_text': 'Request Editor Attention',
    "notification_request_sent_text": "Request sent."
}
ADMIN_COLLABORATOR_ADMIN_URL = "admin"
ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL = "admin/collaboration"

def get_admin_collaborator_websocket_connection_prefix_url():
    if hasattr(settings, "ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL"):
        return settings.ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL
    return ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL
