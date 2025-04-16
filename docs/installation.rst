============
Installation
============

Requirements
-----------

* Django 3.2+
* Redis (for lock management and message distribution)
* Channels 3.0+

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
        # ...
        'channels',
        'django_admin_collaborator',
        # ...
    ]

2. Configure Django Settings
^^^^^^^^^^^^^^^^^^^^^^^^^^

Add the following to your project's ``settings.py``:

.. code-block:: python
    
    # Required: Configure Redis connection (defaults to localhost:6379/0)
    ADMIN_COLLABORATOR_REDIS_URL = env.str("REDIS_URL")

    # Required: Configure Channels to use Redis as the backend
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [('localhost', 6379)],
            },
        },
    }

    # Optional: Configure custom admin URL (useful if you've customized your admin URL)
    ADMIN_COLLABORATOR_ADMIN_URL = env.str("YOUR_SECRET_ADMIN_URL")  # default: 'admin'

    # Optional: Customize notification messages and avatar settings
    # {editor_name} - Will be replaced with the name of the current editor
    ADMIN_COLLABORATOR_OPTIONS = {
        "editor_mode_text": "You are in editor mode.",
        "viewer_mode_text": "This page is being edited by {editor_name}. You cannot make changes until they leave.",
        "claiming_editor_text": "The editor has left. The page will refresh shortly to allow editing.",
        "avatar_field": "avatar"  # Name of the field containing the user's avatar image
    }

3. Set Up ASGI Application
^^^^^^^^^^^^^^^^^^^^^^^^

Create or modify your ``asgi.py`` file:

.. code-block:: python

    # asgi.py
    import os
    from django.core.asgi import get_asgi_application
    from channels.routing import ProtocolTypeRouter, URLRouter
    from channels.auth import AuthMiddlewareStack
    from channels.security.websocket import AllowedHostsOriginValidator

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yourproject.settings')

    django_asgi_app = get_asgi_application()
    from django_admin_collaborator.routing import websocket_urlpatterns

    application = ProtocolTypeRouter({
        'http': django_asgi_app,
        'websocket': AllowedHostsOriginValidator(
            AuthMiddlewareStack(
                URLRouter(
                    websocket_urlpatterns
                )
            )
        ),
    })

4. Enable Collaborative Editing
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Add the mixin to your admin classes:

.. code-block:: python

    from django.contrib import admin
    from django_admin_collaborator.utils import CollaborativeAdminMixin
    from myapp.models import MyModel

    @admin.register(MyModel)
    class MyModelAdmin(CollaborativeAdminMixin, admin.ModelAdmin):
        list_display = ('name', 'description')
        # ... your other admin configurations

5. Run with ASGI Server
^^^^^^^^^^^^^^^^^^^^^

Start your project using an ASGI server like Daphne or Uvicorn:

.. code-block:: bash

    # Using Daphne
    daphne yourproject.asgi:application
    
    # OR using Uvicorn
    uvicorn yourproject.asgi:application --host 0.0.0.0 --reload --reload-include '*.html'

Advanced Configuration
---------------------

Avatar Configuration
^^^^^^^^^^^^^^^^^^^

You can customize the avatar display by setting the ``avatar_field`` in your settings:

.. code-block:: python

    ADMIN_COLLABORATOR_OPTIONS = {
        # ... other options ...
        "avatar_field": "profile_picture"  # Use a different field name for avatars
    }

The avatar field should be an ImageField on your User model. If no avatar is available, the system will display the user's initials instead. When hovering over an avatar, you'll see a tooltip showing the user's name and email.

Implementation Methods
^^^^^^^^^^^^^^^^^^^^

There are multiple ways to implement collaborative editing:

**Method 1: Using the Mixin (Recommended)**

.. code-block:: python

    from django.contrib import admin
    from django_admin_collaborator.utils import CollaborativeAdminMixin
    from myapp.models import MyModel

    @admin.register(MyModel)
    class MyModelAdmin(CollaborativeAdminMixin, admin.ModelAdmin):
        list_display = ('name', 'description')
        # ... your other admin configurations

**Method 2: Using the Utility Function**

.. code-block:: python

    from django.contrib import admin
    from django_admin_collaborator.utils import make_collaborative
    from myapp.models import MyModel

    # Create your admin class
    class MyModelAdmin(admin.ModelAdmin):
        list_display = ('name', 'description')
        # ... your other admin configurations

    # Apply collaborative editing
    CollaborativeMyModelAdmin = make_collaborative(MyModelAdmin)

    # Register with admin
    admin.site.register(MyModel, CollaborativeMyModelAdmin)

**Method 3: Using the Factory Function**

.. code-block:: python

    from django.contrib import admin
    from django_admin_collaborator.utils import collaborative_admin_factory
    from myapp.models import MyModel

    # Create and register the admin class in one go
    admin.site.register(
        MyModel, 
        collaborative_admin_factory(
            MyModel, 
            admin_options={
                'list_display': ('name', 'description'),
                'search_fields': ('name',),
            }
        )
    )

Deployment
---------

Heroku Deployment
^^^^^^^^^^^^^^^

If you're deploying this application on Heroku, ensure that you configure the database connection settings appropriately to optimize performance. Specifically, Heroku may require you to set the ``CONN_MAX_AGE`` to 0 to avoid persistent database connections.

Add the following to your ``settings.py`` file:

.. code-block:: python

    if not DEBUG:
        import django_heroku
        django_heroku.settings(locals())
        DATABASES['default']['CONN_MAX_AGE'] = 0