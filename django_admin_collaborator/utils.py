from typing import Any, Dict, Type

from django.contrib import admin
from django.db import models
from django import forms
from django_admin_collaborator.defaults import DEFAULT_ADMIN_COLLABORATOR_OPTIONS, ADMIN_COLLABORATOR_ADMIN_URL
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


        response = super().change_view(request, object_id, form_url, extra_context)
        if hasattr(response, "render"):
            response.render()
            response.content += f""" 
            <script>
                window.ADMIN_COLLABORATOR_EDITOR_MODE_TEXT = '{editor_mode_text}';
                window.ADMIN_COLLABORATOR_VIEWER_MODE_TEXT = '{viewer_mode_text}';
                window.ADMIN_COLLABORATOR_CLAIMING_EDITOR_TEXT = '{claiming_editor_text}';
                window.ADMIN_COLLABORATOR_ADMIN_URL = '{admin_collaborator_admin_url}';
            </script>
            """.encode(
                "utf-8"
            )
        return response


def make_collaborative(admin_class: Type[admin.ModelAdmin]) -> Type[admin.ModelAdmin]:
    """
    Function to dynamically add collaborative editing to an existing ModelAdmin class.

    Args:
        admin_class: The ModelAdmin class to enhance

    Returns:
        A new ModelAdmin class with collaborative editing capabilities
    """

    class CollaborativeAdmin(CollaborativeAdminMixin, admin_class):
        pass

    return CollaborativeAdmin


def collaborative_admin_factory(
        model_class: Type[models.Model],
        admin_options: Dict[str, Any] = None,
        base_admin_class: Type[admin.ModelAdmin] = admin.ModelAdmin,
) -> Type[admin.ModelAdmin]:
    """
    Factory function to create a collaborative ModelAdmin for a model.

    Args:
        model_class: The model class for which to create the admin
        admin_options: Optional dictionary of admin options
        base_admin_class: Base admin class to extend from (default: admin.ModelAdmin)

    Returns:
        A ModelAdmin class with collaborative editing capabilities
    """
    if admin_options is None:
        admin_options = {}

    # Create a new class dynamically
    attrs = {**admin_options}

    # Create the base admin class
    AdminClass = type(
        f"Collaborative{model_class.__name__}Admin", (base_admin_class,), attrs
    )

    # Add collaborative functionality
    return make_collaborative(AdminClass)
