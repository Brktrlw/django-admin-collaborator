# Django Admin Collaborator

[![PyPI version](https://badge.fury.io/py/django-admin-collaborator.svg)](https://badge.fury.io/py/django-admin-collaborator)
[![Python Versions](https://img.shields.io/pypi/pyversions/django-admin-collaborator.svg)](https://pypi.org/project/django-admin-collaborator/)
[![Django Versions](https://img.shields.io/badge/django-3.2%2B-blue.svg)](https://www.djangoproject.com/)
[![Documentation Status](https://readthedocs.org/projects/django-admin-collaborator/badge/?version=latest)](https://django-admin-collaborator.readthedocs.io/en/latest/?badge=latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Real-time collaborative editing for Django admin interfaces using WebSockets.

## Overview
![Demo](https://raw.githubusercontent.com/Brktrlw/django-admin-collaborator/refs/heads/main/screenshots/demo.gif)

## Features

- **Real-time presence indicators** - See who else is viewing the same object
- **Exclusive editing mode** - Prevents conflicts by allowing only one user to edit at a time
- **Automatic lock release** - Abandoned sessions automatically release editing privileges
- **Seamless integration** with Django admin - Minimal configuration required
- **User avatars and status indicators** - Visual feedback on who's editing
- **Automatic page refresh** when content changes - Stay up to date without manual refreshes

## Requirements

- Django 3.2+
- Redis (for lock management and message distribution)
- Channels 3.0+

## Installation

```bash
pip install django-admin-collaborator
```

## Quick Start

1. Add to INSTALLED_APPS:

```python
INSTALLED_APPS = [
    # ...
    'channels',
    'django_admin_collaborator',
    # ...
]
```

2. Set up your settings:

```python
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
```

3. Set up the ASGI application:

```python
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
```

4. Enable collaborative editing for specific admin classes:

```python
from django.contrib import admin
from django_admin_collaborator.utils import CollaborativeAdminMixin
from myapp.models import MyModel

@admin.register(MyModel)
class MyModelAdmin(CollaborativeAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'description')
    # ... your other admin configurations
```

5. Run your project using an ASGI server like Daphne or Uvicorn:

```bash
daphne yourproject.asgi:application
# OR
uvicorn yourproject.asgi:application --host 0.0.0.0 --reload --reload-include '*.html'
```

## Documentation

For complete documentation, please visit:
- [Read the Docs](https://django-admin-collaborator.readthedocs.io/)

## Advanced Usage

### Applying to Multiple Admin Classes

You can use the utility functions to apply collaborative editing to existing admin classes:

```python
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
```

### Creating Admin Classes Dynamically

You can use the factory function to create admin classes dynamically:

```python
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
```

## Deployment on Heroku

If you're deploying this application on Heroku, ensure that you configure the database connection settings appropriately to optimize performance. Specifically, Heroku may require you to set the `CONN_MAX_AGE` to 0 to avoid persistent database connections.

Add the following to your settings.py file:
```python
if not DEBUG:
    import django_heroku
    django_heroku.settings(locals())
    DATABASES['default']['CONN_MAX_AGE'] = 0
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Django team for their amazing framework
- Channels team for WebSocket support
- All contributors who have helped improve this package