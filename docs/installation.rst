============
Installation
============

Requirements
-----------

- Django 3.2+
- Django Channels 3.0+
- Redis server
- Python 3.8+

Installing the Package
---------------------

You can install Django Admin Collaborator via pip:

.. code-block:: bash

    pip install django-admin-collaborator

Configuration
------------

1. Add Required Applications
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Add to ``INSTALLED_APPS`` in your Django settings:

.. code-block:: python

    INSTALLED_APPS = [
        ...
        'channels',
        'django_admin_collaborator',
        ...
    ]

2. Configure Django Settings
^^^^^^^^^^^^^^^^^^^^^^^^^^

Add the following to your project's ``settings.py``:

.. code-block:: python

    # Required: Configure Redis connection
    ADMIN_COLLABORATOR_REDIS_URL = 'redis://localhost:6379/0'

    # Required: Configure Channels to use Redis as the backend
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [('127.0.0.1', 6379)],
            },
        },
    }

    # Optional: Configure custom admin URL
    ADMIN_COLLABORATOR_ADMIN_URL = 'admin'  # default: 'admin'

    # Optional: Configure WebSocket connection URL prefix
    ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL = 'admin/collaboration'

    # Optional: Redis connection resilience settings
    ADMIN_COLLABORATOR_REDIS_MAX_RETRIES = 3  # Maximum retry attempts for Redis operations
    ADMIN_COLLABORATOR_REDIS_RETRY_DELAY = 0.5  # Delay between retries (seconds, uses exponential backoff)
    ADMIN_COLLABORATOR_REDIS_SOCKET_TIMEOUT = 5  # Redis connection timeout (seconds)
    ADMIN_COLLABORATOR_REDIS_MAX_CONNECTIONS = 10  # Maximum connections in the Redis pool

    # Optional: Customize notification messages and avatar settings
    ADMIN_COLLABORATOR_OPTIONS = {
        "editor_mode_text": "You are in editor mode.",
        "viewer_mode_text": "This page is being edited by {editor_name}. You cannot make changes until they leave.",
        "claiming_editor_text": "The editor has left. The page will refresh shortly to allow editing.",
        "avatar_field": None,  # Name of the field containing the user's avatar image
        "notification_request_interval": 15,  # Seconds between notification requests
        "notification_message": "User {username} is requesting the editors attention.",
        "notification_button_text": "Request Editor Attention",
        "notification_request_sent_text": "Request sent.",  # Message shown to the requester
        # Chat settings
        "enable_chat": True,  # Enable/disable the chat feature
        "chat_user_list_title": "Online Users",  # Title for the user list panel
        "chat_empty_state_text": "No other users online",  # Text when no users are online
        "chat_start_conversation_text": "No messages yet. Start the conversation!",  # Text for empty chat
    }

3. Set Up ASGI Application
^^^^^^^^^^^^^^^^^^^^^^^^

Create or modify your ``asgi.py`` file:

.. code-block:: python

    from django.core.asgi import get_asgi_application
    from channels.routing import ProtocolTypeRouter, URLRouter
    from channels.auth import AuthMiddlewareStack

    # first get asgi application
    django_asgi_app = get_asgi_application()

    # then import websocket_urlpatterns
    from django_admin_collaborator.routing import websocket_urlpatterns

    application = ProtocolTypeRouter({
        'http': django_asgi_app,
        'websocket': AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        ),
    })

4. Run with ASGI Server
^^^^^^^^^^^^^^^^^^^^^

Start your project using an ASGI server:

.. code-block:: bash

    # Using Daphne
    daphne yourproject.asgi:application

    # OR using Uvicorn
    uvicorn yourproject.asgi:application --host 0.0.0.0 --reload --reload-include '*.html'

Deployment
---------

Heroku Deployment
^^^^^^^^^^^^^^^

If you're deploying this application on Heroku, ensure that you configure the database connection settings appropriately:

.. code-block:: python

    if not DEBUG:
        import django_heroku
        django_heroku.settings(locals())
        DATABASES['default']['CONN_MAX_AGE'] = 0

Redis Connection Resilience
^^^^^^^^^^^^^^^^^^^^^^^^^^

For production deployments, especially on platforms like Heroku, you may experience occasional "Connection reset by peer" errors with Redis. The package includes built-in resilience features that can be configured:

.. code-block:: python

    # Increase retry attempts for unstable connections
    ADMIN_COLLABORATOR_REDIS_MAX_RETRIES = 5

    # Adjust backoff delay between retries
    ADMIN_COLLABORATOR_REDIS_RETRY_DELAY = 0.5  # seconds

    # Increase socket timeout for slow network conditions
    ADMIN_COLLABORATOR_REDIS_SOCKET_TIMEOUT = 10  # seconds

    # Adjust connection pool size based on your application's traffic
    ADMIN_COLLABORATOR_REDIS_MAX_CONNECTIONS = 20
