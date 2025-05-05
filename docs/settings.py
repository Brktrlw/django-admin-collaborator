# Minimal Django settings for documentation building
# This file is used by sphinx-build to import and autodoc the Django package

SECRET_KEY = 'django-admin-collaborator-docs'

# Required Django settings
DEBUG = True
USE_TZ = True
USE_I18N = True

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ROOT_URLCONF = 'django.urls'
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    'django_admin_collaborator',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

# Settings for django-admin-collaborator
ADMIN_COLLABORATOR_REDIS_URL = 'redis://localhost:6379/0'
ADMIN_COLLABORATOR_ADMIN_URL = 'admin'

# Redis connection resilience settings
ADMIN_COLLABORATOR_REDIS_MAX_RETRIES = 3  # Maximum number of retry attempts for Redis operations
ADMIN_COLLABORATOR_REDIS_RETRY_DELAY = 0.5  # Delay between retries in seconds (uses exponential backoff)
ADMIN_COLLABORATOR_REDIS_SOCKET_TIMEOUT = 5  # Redis connection timeout in seconds
ADMIN_COLLABORATOR_REDIS_MAX_CONNECTIONS = 10  # Maximum number of connections in the Redis connection pool

DEFAULT_ADMIN_COLLABORATOR_OPTIONS = {
    "editor_mode_text": "You are in editor mode.",
    "viewer_mode_text": "This page is being edited by {editor_name}. You cannot make changes until they leave.",
    "claiming_editor_text": "The editor has left. The page will refresh shortly to allow editing.",
    "avatar_field": None,
    "notification_request_interval": 15,
    "notification_message": "User {username} is requesting the editors attention.",
    "notification_button_text": "Request Editor Attention",
    "notification_request_sent_text": "Request sent.",
    # Chat settings
    "enable_chat": True,  # Enable/disable the chat feature
    "chat_user_list_title": "Online Users",  # Title for the user list panel
    "chat_empty_state_text": "No other users online",  # Text when no users are online
    "chat_start_conversation_text": "No messages yet. Start the conversation!",  # Text for empty chat
    "chat_input_placeholder": "Type a message...",  # Placeholder text for chat input field
    "chat_online_status_text": "Online",  # Text for online status indicator
}
