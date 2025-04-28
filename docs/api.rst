API Reference
=============

This section provides detailed documentation for the Django Admin Collaborator API.

Admin Mixins
-----------

.. autoclass:: django_admin_collaborator.utils.CollaborativeAdminMixin
   :members:
   :undoc-members:
   :show-inheritance:

   The ``CollaborativeAdminMixin`` adds collaborative editing capabilities to Django admin classes.
   It provides real-time editing features and user presence detection.

Utility Functions
---------------

.. autofunction:: django_admin_collaborator.utils.make_collaborative

   Converts a regular ModelAdmin class into a collaborative one.

.. autofunction:: django_admin_collaborator.utils.collaborative_admin_factory

   Creates a collaborative ModelAdmin class with specified options.

WebSocket Consumers
-----------------

.. autoclass:: django_admin_collaborator.consumers.AdminCollaborationConsumer
   :members:
   :undoc-members:
   :show-inheritance:

   Handles WebSocket connections for real-time collaboration features.
   Manages edit locks, user presence, and notifications.
