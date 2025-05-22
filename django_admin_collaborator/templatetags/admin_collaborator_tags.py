from django import template
from django.conf import settings
from django.utils.safestring import mark_safe
from django_admin_collaborator.defaults import DEFAULT_ADMIN_COLLABORATOR_OPTIONS

register = template.Library()

@register.simple_tag
def load_chat_colors():
    """
    Generates CSS rules to override default chat colors based on settings.
    """
    options = getattr(settings, 'ADMIN_COLLABORATOR_OPTIONS', DEFAULT_ADMIN_COLLABORATOR_OPTIONS)

    primary_color = options.get('CHAT_PRIMARY_COLOR', DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_COLOR'])
    primary_hover_color = options.get('CHAT_PRIMARY_HOVER_COLOR', DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_HOVER_COLOR'])
    background_color = options.get('CHAT_BACKGROUND_COLOR', DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BACKGROUND_COLOR'])
    text_color = options.get('CHAT_TEXT_COLOR', DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_TEXT_COLOR'])
    border_color = options.get('CHAT_BORDER_COLOR', DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BORDER_COLOR'])

    css_rules = f"""
    <style>
        :root {{
            --chat-primary: {primary_color};
            --chat-primary-hover: {primary_hover_color};
            --chat-bg: {background_color};
            --chat-text: {text_color};
            --chat-border: {border_color};
        }}
    </style>
    """
    return mark_safe(css_rules)
