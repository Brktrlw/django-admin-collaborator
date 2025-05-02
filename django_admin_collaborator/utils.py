from django import forms
from django_admin_collaborator.defaults import (
    DEFAULT_ADMIN_COLLABORATOR_OPTIONS,
    ADMIN_COLLABORATOR_ADMIN_URL,
    get_admin_collaborator_websocket_connection_prefix_url
)
from django.conf import settings

class CollaborativeAdminMixin:
    """
    Mixin for ModelAdmin classes to enable collaborative editing.
    This mixin adds the necessary JavaScript to the admin interface
    for real-time collaboration features.
    """

    class Media:
        js = [
            "django_admin_collaborator/js/admin_edit.js",
            "django_admin_collaborator/js/admin_chat.js"
        ]
        css = {
            'all': [
                "django_admin_collaborator/css/admin_chat.css"
            ]
        }

    def change_view(self, request, object_id, form_url="", extra_context=None):
        editor_mode_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "editor_mode_text", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["editor_mode_text"]
        )
        viewer_mode_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "viewer_mode_text", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["viewer_mode_text"]
        )
        claiming_editor_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "claiming_editor_text",
            DEFAULT_ADMIN_COLLABORATOR_OPTIONS["claiming_editor_text"],
        )
        admin_collaborator_admin_url = getattr(settings, "ADMIN_COLLABORATOR_ADMIN_URL", ADMIN_COLLABORATOR_ADMIN_URL)
        avatar_field = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "avatar_field", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["avatar_field"]
        )
        notification_request_interval = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "notification_request_interval", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["notification_request_interval"]
        )
        notification_message = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "notification_message", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["notification_message"]
        )

        admin_collaborator_websocket_connection_prefix_url = get_admin_collaborator_websocket_connection_prefix_url()

        notification_button_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "notification_button_text", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["notification_button_text"]
        )
        notification_request_sent_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "notification_request_sent_text", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["notification_request_sent_text"]
        )

        # Chat settings
        enable_chat = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "enable_chat", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["enable_chat"]
        )
        chat_user_list_title = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "chat_user_list_title", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["chat_user_list_title"]
        )
        chat_empty_state_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "chat_empty_state_text", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["chat_empty_state_text"]
        )
        chat_start_conversation_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "chat_start_conversation_text", DEFAULT_ADMIN_COLLABORATOR_OPTIONS["chat_start_conversation_text"]
        )
        chat_input_placeholder = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "chat_input_placeholder", DEFAULT_ADMIN_COLLABORATOR_OPTIONS.get("chat_input_placeholder", "Type a message...")
        )
        chat_online_status_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "chat_online_status_text", DEFAULT_ADMIN_COLLABORATOR_OPTIONS.get("chat_online_status_text", "Online")
        )
        chat_offline_status_text = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "chat_offline_status_text", DEFAULT_ADMIN_COLLABORATOR_OPTIONS.get("chat_offline_status_text", "Offline")
        )
        chat_offline_placeholder = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "chat_offline_placeholder", DEFAULT_ADMIN_COLLABORATOR_OPTIONS.get("chat_offline_placeholder", "User is offline. Messages cannot be sent.")
        )
        chat_cannot_send_message = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", {}).get(
            "chat_cannot_send_message", DEFAULT_ADMIN_COLLABORATOR_OPTIONS.get("chat_cannot_send_message", "Cannot send message. User is offline.")
        )

        response = super().change_view(request, object_id, form_url, extra_context)
        if hasattr(response, "render"):
            response.render()
            response.content += f"""
            <script>
                window.ADMIN_COLLABORATOR_EDITOR_MODE_TEXT = '{editor_mode_text}';
                window.ADMIN_COLLABORATOR_VIEWER_MODE_TEXT = '{viewer_mode_text}';
                window.ADMIN_COLLABORATOR_CLAIMING_EDITOR_TEXT = '{claiming_editor_text}';
                window.ADMIN_COLLABORATOR_ADMIN_URL = '{admin_collaborator_admin_url}';
                window.ADMIN_COLLABORATOR_AVATAR_FIELD = '{avatar_field}';
                window.ADMIN_COLLABORATOR_NOTIFICATION_INTERVAL = {notification_request_interval};
                window.ADMIN_COLLABORATOR_NOTIFICATION_MESSAGE = '{notification_message}';
                window.ADMIN_COLLABORATOR_NOTIFICATION_BUTTON_TEXT = '{notification_button_text}';
                window.ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL = '{admin_collaborator_websocket_connection_prefix_url}';
                window.ADMIN_COLLABORATOR_NOTIFICATION_REQUEST_SENT_TEXT = '{notification_request_sent_text}';
                window.ADMIN_COLLABORATOR_ENABLE_CHAT = {str(enable_chat).lower()};
                window.ADMIN_COLLABORATOR_CHAT_USER_LIST_TITLE = '{chat_user_list_title}';
                window.ADMIN_COLLABORATOR_CHAT_EMPTY_STATE_TEXT = '{chat_empty_state_text}';
                window.ADMIN_COLLABORATOR_CHAT_START_CONVERSATION_TEXT = '{chat_start_conversation_text}';
                window.ADMIN_COLLABORATOR_CHAT_INPUT_PLACEHOLDER = '{chat_input_placeholder}';
                window.ADMIN_COLLABORATOR_CHAT_ONLINE_STATUS_TEXT = '{chat_online_status_text}';
                window.ADMIN_COLLABORATOR_CHAT_OFFLINE_STATUS_TEXT = '{chat_offline_status_text}';
                window.ADMIN_COLLABORATOR_CHAT_OFFLINE_PLACEHOLDER = '{chat_offline_placeholder}';
                window.ADMIN_COLLABORATOR_CHAT_CANNOT_SEND_MESSAGE = '{chat_cannot_send_message}';
                document.body.dataset.userId = '{request.user.id}';
            </script>
            """.encode(
                "utf-8"
            )
        return response
