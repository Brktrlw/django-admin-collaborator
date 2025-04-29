Usage
=====

Basic Setup
----------

1. Import and add the mixin to your ModelAdmin classes:

.. code-block:: python

    from django.contrib import admin
    from django_admin_collaborator.utils import CollaborativeAdminMixin
    from myapp.models import MyModel

    @admin.register(MyModel)
    class MyModelAdmin(CollaborativeAdminMixin, admin.ModelAdmin):
        # Your admin configuration here
        pass

2. That's it! The collaboration features will now be available in the admin interface.

Chat Feature
-----------

The Django Admin Collaborator includes a real-time chat feature that allows users viewing the same page to communicate with each other.

How It Works
^^^^^^^^^^^

- Users on the same page will see a user list panel at the bottom right corner of the screen
- The panel shows all other users currently viewing the same page
- Clicking on a user opens a chat window for direct messaging
- Multiple chat windows can be open at once
- Chat messages are only visible during the current session and are not stored in the database
- Users who leave the page will no longer be shown in the user list

Customizing the Chat Feature
^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can customize the chat feature through settings in your ``settings.py`` file:

.. code-block:: python

    ADMIN_COLLABORATOR_OPTIONS = {
        # Other settings...

        # Chat settings
        "enable_chat": True,  # Set to False to disable the chat feature
        "chat_user_list_title": "Online Users",  # Title for the user list panel
        "chat_empty_state_text": "No other users online",  # Text when no users are online
        "chat_start_conversation_text": "No messages yet. Start the conversation!",  # Text for empty chat
        "chat_input_placeholder": "Type a message...",  # Placeholder text for chat input field
        "chat_online_status_text": "Online",  # Text for online status indicator
    }

Chat UI Features
^^^^^^^^^^^^^

- **User List Panel**: Shows all users on the current page with online status
- **Individual Chat Windows**: Open, minimize, and close separate chat windows for each user
- **Message Bubbles**: Clear distinction between sent and received messages
- **Online Status**: Green dot indicator shows who is currently online
- **Avatar Support**: Uses the same avatar configuration as the collaboration feature
