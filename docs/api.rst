API Reference
=============

This section provides detailed documentation for the Django Admin Collaborator API.

Admin Mixins
------------

.. autoclass:: django_admin_collaborator.utils.CollaborativeAdminMixin
   :members:
   :undoc-members:
   :show-inheritance:

   Adds collaborative editing capabilities to a Django ``ModelAdmin``.
   Provides real-time editing locks, user presence, and the chat UI.

WebSocket Consumers
-------------------

.. autoclass:: django_admin_collaborator.consumers.AdminCollaborationConsumer
   :members:
   :undoc-members:
   :show-inheritance:

   Handles WebSocket connections for the collaborative edit lock and
   editor-presence features on an admin detail page.

.. autoclass:: django_admin_collaborator.consumers.ChatConsumer
   :members:
   :undoc-members:
   :show-inheritance:

   Handles WebSocket connections for the per-page chat panel between
   admin users viewing the same object.

Module-level helpers
--------------------

.. autofunction:: django_admin_collaborator.consumers.get_utc_timestamp

.. autoclass:: django_admin_collaborator.consumers.RedisClientMixin
   :members:
   :show-inheritance:

   Shared Redis client, connection pool, retry-wrapped helpers, and
   authentication helper. Both bundled consumers inherit from this; you
   can also inherit from it if you build your own consumer.
