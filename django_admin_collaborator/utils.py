
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

    @property
    def media(self):
        extra = super().media
        js = ["django_admin_collaborator/js/admin_edit.js"]
        return forms.Media(js=[*extra._js, *js])

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
            </script>
            """.encode(
                "utf-8"
            )
        return response
