# Django Admin Collaborator
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/brktrl)
[![PyPI version](https://badge.fury.io/py/django-admin-collaborator.svg)](https://badge.fury.io/py/django-admin-collaborator)
[![Python Versions](https://img.shields.io/pypi/pyversions/django-admin-collaborator.svg)](https://pypi.org/project/django-admin-collaborator/)
[![Django Versions](https://img.shields.io/badge/django-3.2%2B-blue.svg)](https://www.djangoproject.com/)
[![Documentation Status](https://readthedocs.org/projects/django-admin-collaborator/badge/?version=latest)](https://django-admin-collaborator.readthedocs.io/en/latest/?badge=latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Django application that enables real-time collaborative editing in the Django admin interface. This package allows multiple admin users to work together while preventing concurrent edits to the same object.

## Features

- ✨ **Real-time Collaborative Editing** - One user can edit while others view in real-time, preventing conflicts
- 🔒 **Edit Lock Management** - Prevents concurrent edits to the same object
- 👥 **User Presence Detection** - See who else is viewing the same object
- 🔔 **Editor Attention System** - Request attention from the current editor
- 💬 **Customizable Notifications** - Configure your own notification messages
- 👤 **Avatar Support** - Visual user identification with customizable avatars
- 🔌 **Redis Integration** - Reliable lock management and message distribution
- 🔄 **Django Channels** - WebSocket-based real-time communication

## Overview

![Demo](https://raw.githubusercontent.com/Brktrlw/django-admin-collaborator/refs/heads/main/screenshots/demo.gif)

## Requirements

- Django 3.2+
- Django Channels 3.0+
- Redis server
- Python 3.8+

## Installation

1. Install the package using pip:
```bash
pip install django-admin-collaborator
```

2. Add 'django_admin_collaborator' to your INSTALLED_APPS in settings.py:
```python
INSTALLED_APPS = [
    ...
    'channels',
    'django_admin_collaborator',
    ...
]
```

3. Configure your Django Channels layer in settings.py:
```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}
```

4. Add the WebSocket routing to your asgi.py:
```python
django_asgi_app = get_asgi_application()
from django_admin_collaborator.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
```

## Configuration

You can customize the behavior of django-admin-collaborator by adding the following settings to your settings.py:

```python
ADMIN_COLLABORATOR_OPTIONS = {
    'editor_mode_text': 'You are in editor mode.',
    'viewer_mode_text': 'This page is being edited by {editor_name}. You cannot make changes until they leave.',
    'claiming_editor_text': 'The editor has left. The page will refresh shortly to allow editing.',
    'avatar_field': None,  # Set to a field name in your User model to display avatars
    'notification_request_interval': 15,  # Seconds between notification requests
    'notification_message': 'User {username} is requesting the editors attention.',
    'notification_button_text': 'Request Editor Attention',
    'notification_request_sent_text': 'Request sent.'
}

ADMIN_COLLABORATOR_ADMIN_URL = 'admin'  # Your admin URL prefix
ADMIN_COLLABORATOR_REDIS_URL = 'redis://localhost:6379/0'  # Redis connection URL
ADMIN_COLLABORATOR_WEBSOCKET_CONNECTION_PREFIX_URL = 'admin/collaboration'  # WebSocket connection URL prefix
```

## Usage

1. Add the CollaborativeAdminMixin to your ModelAdmin classes:
```python
from django_admin_collaborator.utils import CollaborativeAdminMixin

class YourModelAdmin(CollaborativeAdminMixin, admin.ModelAdmin):
    ...
```


## Features in Detail

### Edit Lock Management
- Only one user can edit an object at a time
- Automatic lock release when user disconnects
- Visual indication of edit status
- Automatic page refresh when edit lock is released

### Real-time Communication
- WebSocket-based communication for instant updates
- User presence detection
- Editor status broadcasting
- Content update notifications

### Editor Attention System
- Users can request editor's attention
- Configurable notification intervals
- Customizable notification messages
- Visual indicators for attention requests

### Customization Options
- Customizable text messages
- Avatar support for user identification
- Configurable notification intervals
- Customizable admin URL prefix
- Redis connection configuration

## Security

- WebSocket connections are authenticated using Django's authentication system
- Only staff users can access collaborative features
- Redis-based lock management ensures data consistency
- Secure WebSocket communication

## Deployment

### Heroku Deployment

If you're deploying this application on Heroku, ensure that you configure the database connection settings appropriately to optimize performance:

```python
# settings.py
if not DEBUG:
    import django_heroku
    django_heroku.settings(locals())
    DATABASES['default']['CONN_MAX_AGE'] = 0
```

## Documentation

For complete documentation, please visit:
- [Read the Docs](https://django-admin-collaborator.readthedocs.io/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Django team for their amazing framework
- Channels team for WebSocket support
- All contributors who have helped improve this package

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.
