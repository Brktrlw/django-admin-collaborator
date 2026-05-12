import json

from django.conf import settings

from django_admin_collaborator.defaults import (
    ADMIN_COLLABORATOR_ADMIN_URL,
    DEFAULT_ADMIN_COLLABORATOR_OPTIONS,
    get_admin_collaborator_websocket_connection_prefix_url,
)


def _get_options() -> dict:
    """Merge user-provided ``ADMIN_COLLABORATOR_OPTIONS`` over the package defaults."""
    user_opts = getattr(settings, "ADMIN_COLLABORATOR_OPTIONS", None) or {}
    return {**DEFAULT_ADMIN_COLLABORATOR_OPTIONS, **user_opts}


class CollaborativeAdminMixin:
    """
    Mixin for ModelAdmin classes to enable collaborative editing.

    Adds the JS/CSS assets for the collaboration UI and injects a window-scoped
    config object so the JS can read user-customizable strings.
    """

    class Media:
        js = [
            "django_admin_collaborator/js/admin_edit.js",
            "django_admin_collaborator/js/admin_chat.js",
        ]
        css = {
            "all": [
                "django_admin_collaborator/css/admin_chat.css",
            ]
        }

    def change_view(self, request, object_id, form_url="", extra_context=None):
        response = super().change_view(request, object_id, form_url, extra_context)
        if not hasattr(response, "render"):
            return response

        opts = _get_options()
        # Single dict drives the JS-side ``window.ADMIN_COLLABORATOR_*`` globals.
        # Using json.dumps below is what makes the inline script safe against
        # quote/newline characters in any user-overridden option value.
        js_globals = {
            "ADMIN_COLLABORATOR_EDITOR_MODE_TEXT": opts["editor_mode_text"],
            "ADMIN_COLLABORATOR_VIEWER_MODE_TEXT": opts["viewer_mode_text"],
            "ADMIN_COLLABORATOR_CLAIMING_EDITOR_TEXT": opts["claiming_editor_text"],
            "ADMIN_COLLABORATOR_ADMIN_URL": getattr(
                settings, "ADMIN_COLLABORATOR_ADMIN_URL", ADMIN_COLLABORATOR_ADMIN_URL
            ),
            "ADMIN_COLLABORATOR_AVATAR_FIELD": opts["avatar_field"],
            "ADMIN_COLLABORATOR_NOTIFICATION_INTERVAL": opts["notification_request_interval"],
            "ADMIN_COLLABORATOR_NOTIFICATION_MESSAGE": opts["notification_message"],
            "ADMIN_COLLABORATOR_NOTIFICATION_BUTTON_TEXT": opts["notification_button_text"],
            "ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL":
                get_admin_collaborator_websocket_connection_prefix_url(),
            "ADMIN_COLLABORATOR_NOTIFICATION_REQUEST_SENT_TEXT": opts["notification_request_sent_text"],
            "ADMIN_COLLABORATOR_ENABLE_CHAT": opts["enable_chat"],
            "ADMIN_COLLABORATOR_CHAT_USER_LIST_TITLE": opts["chat_user_list_title"],
            "ADMIN_COLLABORATOR_CHAT_EMPTY_STATE_TEXT": opts["chat_empty_state_text"],
            "ADMIN_COLLABORATOR_CHAT_START_CONVERSATION_TEXT": opts["chat_start_conversation_text"],
            "ADMIN_COLLABORATOR_CHAT_INPUT_PLACEHOLDER": opts["chat_input_placeholder"],
            "ADMIN_COLLABORATOR_CHAT_ONLINE_STATUS_TEXT": opts["chat_online_status_text"],
            "ADMIN_COLLABORATOR_CHAT_OFFLINE_STATUS_TEXT": opts["chat_offline_status_text"],
            "ADMIN_COLLABORATOR_CHAT_OFFLINE_PLACEHOLDER": opts["chat_offline_placeholder"],
            "ADMIN_COLLABORATOR_CHAT_CANNOT_SEND_MESSAGE": opts["chat_cannot_send_message"],
        }

        response.render()
        assignments = "\n".join(
            f"window.{name} = {json.dumps(value)};" for name, value in js_globals.items()
        )
        # ``</`` inside a JSON string would close the surrounding <script> tag in
        # older browsers — escape any literal occurrences before inlining.
        assignments = assignments.replace("</", "<\\/")
        response.content += (
            f"<script>\n{assignments}\n"
            f"document.body.dataset.userId = {json.dumps(str(request.user.id))};\n"
            f"</script>"
        ).encode("utf-8")
        return response
