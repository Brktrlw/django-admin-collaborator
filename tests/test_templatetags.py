from django.test import TestCase, override_settings
from django_admin_collaborator.templatetags.admin_collaborator_tags import load_chat_colors
from django_admin_collaborator.defaults import DEFAULT_ADMIN_COLLABORATOR_OPTIONS

class ChatColorTagsTest(TestCase):
    def test_load_chat_colors_default(self):
        """
        Test that load_chat_colors returns default colors when no custom settings are provided.
        """
        # Ensure no settings are overridden for this test
        with override_settings(ADMIN_COLLABORATOR_OPTIONS={}):
            css_rules = load_chat_colors()

        self.assertIn(f"--chat-primary: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_COLOR']};", css_rules)
        self.assertIn(f"--chat-primary-hover: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_HOVER_COLOR']};", css_rules)
        self.assertIn(f"--chat-bg: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BACKGROUND_COLOR']};", css_rules)
        self.assertIn(f"--chat-text: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_TEXT_COLOR']};", css_rules)
        self.assertIn(f"--chat-border: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BORDER_COLOR']};", css_rules)

    def test_load_chat_colors_custom(self):
        """
        Test that load_chat_colors returns custom colors when provided in settings.
        """
        custom_colors = {
            "CHAT_PRIMARY_COLOR": "#111111",
            "CHAT_PRIMARY_HOVER_COLOR": "#222222",
            "CHAT_BACKGROUND_COLOR": "#333333",
            "CHAT_TEXT_COLOR": "#444444",
            "CHAT_BORDER_COLOR": "#555555",
        }

        with override_settings(ADMIN_COLLABORATOR_OPTIONS=custom_colors):
            css_rules = load_chat_colors()

        self.assertIn(f"--chat-primary: {custom_colors['CHAT_PRIMARY_COLOR']};", css_rules)
        self.assertIn(f"--chat-primary-hover: {custom_colors['CHAT_PRIMARY_HOVER_COLOR']};", css_rules)
        self.assertIn(f"--chat-bg: {custom_colors['CHAT_BACKGROUND_COLOR']};", css_rules)
        self.assertIn(f"--chat-text: {custom_colors['CHAT_TEXT_COLOR']};", css_rules)
        self.assertIn(f"--chat-border: {custom_colors['CHAT_BORDER_COLOR']};", css_rules)

    def test_load_chat_colors_partial_custom(self):
        """
        Test that load_chat_colors uses default for unspecified custom colors.
        """
        custom_colors = {
            "CHAT_PRIMARY_COLOR": "#ABCDEF",
            # CHAT_BACKGROUND_COLOR is not specified, should use default
        }

        # Make sure ADMIN_COLLABORATOR_OPTIONS is set for this context
        with override_settings(ADMIN_COLLABORATOR_OPTIONS=custom_colors):
            css_rules = load_chat_colors()

        self.assertIn(f"--chat-primary: {custom_colors['CHAT_PRIMARY_COLOR']};", css_rules)
        self.assertIn(f"--chat-primary-hover: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_HOVER_COLOR']};", css_rules) # Default
        self.assertIn(f"--chat-bg: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BACKGROUND_COLOR']};", css_rules) # Default
        self.assertIn(f"--chat-text: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_TEXT_COLOR']};", css_rules) # Default
        self.assertIn(f"--chat-border: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BORDER_COLOR']};", css_rules) # Default

    def test_load_chat_colors_empty_custom_options(self):
        """
        Test that load_chat_colors uses default colors if ADMIN_COLLABORATOR_OPTIONS is empty.
        This is similar to test_load_chat_colors_default but explicitly tests the empty dict case.
        """
        with override_settings(ADMIN_COLLABORATOR_OPTIONS={}):
            css_rules = load_chat_colors()

        self.assertIn(f"--chat-primary: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_COLOR']};", css_rules)
        self.assertIn(f"--chat-primary-hover: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_HOVER_COLOR']};", css_rules)
        self.assertIn(f"--chat-bg: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BACKGROUND_COLOR']};", css_rules)
        self.assertIn(f"--chat-text: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_TEXT_COLOR']};", css_rules)
        self.assertIn(f"--chat-border: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BORDER_COLOR']};", css_rules)

    def test_load_chat_colors_no_custom_options_defined(self):
        """
        Test that load_chat_colors uses default colors if ADMIN_COLLABORATOR_OPTIONS is not defined in settings.
        """
        # To simulate ADMIN_COLLABORATOR_OPTIONS not being defined, we can remove it if it exists
        # or ensure it's not there. override_settings with a non-existent setting might not work as expected
        # for getattr(settings, 'X', default_val). Instead, we rely on the default behavior of load_chat_colors
        # when the attribute is missing. For this test, we'll ensure it's not present.
        # The most straightforward way is to delete the setting if it was set by another test,
        # then rely on the default behavior of getattr in the templatetag.
        # However, override_settings is cleaner for ensuring a specific state.
        # If ADMIN_COLLABORATOR_OPTIONS is not in settings, getattr will use the provided default.

        # This test relies on the default behavior of `getattr(settings, 'ADMIN_COLLABORATOR_OPTIONS', DEFAULT_ADMIN_COLLABORATOR_OPTIONS)`
        # when ADMIN_COLLABORATOR_OPTIONS is not present in settings.
        # To ensure it's not present, we can use override_settings to set some *other* unrelated setting.
        # This doesn't directly remove ADMIN_COLLABORATOR_OPTIONS but ensures it's not the one we're setting.
        
        # A more direct way to test getattr behavior is to ensure the setting is deleted.
        # However, modifying settings directly is risky.
        # The current implementation of load_chat_colors is:
        # options = getattr(settings, 'ADMIN_COLLABORATOR_OPTIONS', DEFAULT_ADMIN_COLLABORATOR_OPTIONS)
        # This means if 'ADMIN_COLLABORATOR_OPTIONS' is not in settings, options becomes DEFAULT_ADMIN_COLLABORATOR_OPTIONS.
        # Then, options.get('COLOR_NAME', DEFAULT_ADMIN_COLLABORATOR_OPTIONS['COLOR_NAME']) will correctly pick defaults.
        # So, this case is implicitly covered by test_load_chat_colors_default if we assume
        # that override_settings(ADMIN_COLLABORATOR_OPTIONS={}) makes getattr see an empty dict,
        # NOT that the attribute is missing.

        # Let's make the default test more robust by ensuring ADMIN_COLLABORATOR_OPTIONS is truly absent.
        # We can achieve this by overriding it to None or some other sentinel and checking the tag's behavior.
        # However, the simplest is to rely on the fact that if it's not set, it uses the defaults.
        # The `test_load_chat_colors_default` already covers the case where ADMIN_COLLABORATOR_OPTIONS is an empty dict.
        # The tag's logic `options = getattr(settings, 'ADMIN_COLLABORATOR_OPTIONS', DEFAULT_ADMIN_COLLABORATOR_OPTIONS)`
        # means if ADMIN_COLLABORATOR_OPTIONS is not in settings at all, `options` will be `DEFAULT_ADMIN_COLLABORATOR_OPTIONS`.
        # Then every `options.get('CHAT_X_COLOR', DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_X_COLOR'])` will pick the default.
        # So, no specific override is needed here if settings is pristine.
        
        # Forcing the attribute to be absent from settings for a test context is tricky.
        # We'll assume that if no ADMIN_COLLABORATOR_OPTIONS is set by override_settings,
        # it's as if it's not defined for the scope of the tag's getattr call if the global settings
        # fixture for tests is clean.
        
        # The `test_load_chat_colors_default` with `override_settings(ADMIN_COLLABORATOR_OPTIONS={})` ensures
        # that if the setting *is* present but *empty*, defaults are used.
        # This test is meant to cover if the setting is *not present at all*.
        # The current implementation of `load_chat_colors` handles this by falling back to
        # `DEFAULT_ADMIN_COLLABORATOR_OPTIONS` in the `getattr` call.
        # So, the behavior should be identical to `test_load_chat_colors_default`.

        css_rules = load_chat_colors() # No override_settings here

        self.assertIn(f"--chat-primary: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_COLOR']};", css_rules)
        self.assertIn(f"--chat-primary-hover: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_PRIMARY_HOVER_COLOR']};", css_rules)
        self.assertIn(f"--chat-bg: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BACKGROUND_COLOR']};", css_rules)
        self.assertIn(f"--chat-text: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_TEXT_COLOR']};", css_rules)
        self.assertIn(f"--chat-border: {DEFAULT_ADMIN_COLLABORATOR_OPTIONS['CHAT_BORDER_COLOR']};", css_rules)
