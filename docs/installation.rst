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

Basic Setup
----------

1. Add to INSTALLED_APPS in your Django settings:

   .. code-block:: python

       INSTALLED_APPS = [
           # ...
           'channels',
           'django_admin_collaborator',
           # ...
       ]

2. Set up your settings:

   .. code-block:: python
    
       # Configure Redis connection (defaults to localhost:6379/0)
       ADMIN_COLLABORATOR_REDIS_URL = env.str("REDIS_URL")

       # Optional: Configure custom admin URL (useful if you've customized your admin URL)
       ADMIN_COLLABORATOR_ADMIN_URL = env.str("YOUR_SECRET_ADMIN_URL") # default: 'admin'

       # Configure Channels to use Redis as the backend
       CHANNEL_LAYERS = {
           'default': {
               'BACKEND': 'channels_redis.core.RedisChannelLayer',
               'CONFIG': {
                   'hosts': [('localhost', 6379)],
               },
           },
       }

       # Optional: Customize notification messages. These are the default values that can be overridden
       # {editor_name} - Will be replaced with the name of the current editor
       ADMIN_COLLABORATOR_OPTIONS = {
           "editor_mode_text": "You are in editor mode.",
           "viewer_mode_text": "This page is being edited by {editor_name}. You cannot make changes until they leave.",
           "claiming_editor_text": "The editor has left. The page will refresh shortly to allow editing."
       }

3. Set up the ASGI application:

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

4. Run your project using an ASGI server like Daphne or Uvicorn:

   .. code-block:: bash

       daphne yourproject.asgi:application
       # OR
       uvicorn yourproject.asgi:application --host 0.0.0.0 --reload --reload-include '*.html'

Deployment on Heroku
-------------------

If you're deploying this application on Heroku, ensure that you configure the database connection settings appropriately to optimize performance. Specifically, Heroku may require you to set the ``CONN_MAX_AGE`` to 0 to avoid persistent database connections.

Add the following to your settings.py file:

.. code-block:: python

    if not DEBUG:
        import django_heroku
        django_heroku.settings(locals())
        DATABASES['default']['CONN_MAX_AGE'] = 0