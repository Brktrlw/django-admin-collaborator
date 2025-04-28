Usage
=====

Basic Usage
----------

To enable collaborative editing for a specific admin class, inherit from the ``CollaborativeAdminMixin``:

.. code-block:: python

    from django.contrib import admin
    from django_admin_collaborator.utils import CollaborativeAdminMixin

    class YourModelAdmin(CollaborativeAdminMixin, admin.ModelAdmin):
        ...

Implementation Methods
--------------------

You can implement collaborative editing in several ways:

1. **Using the Mixin**
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The simplest and most straightforward approach:

.. code-block:: python

    from django.contrib import admin
    from django_admin_collaborator.utils import CollaborativeAdminMixin

    class YourModelAdmin(CollaborativeAdminMixin, admin.ModelAdmin):
        ...

Best Practices
-------------

1. **Choose the Right Implementation Method**
   - Use the Mixin approach for new admin classes
   - Ensure proper inheritance order (CollaborativeAdminMixin before admin.ModelAdmin)

2. **Configure Notifications**
   - Set appropriate notification intervals
   - Customize messages to match your application's tone
   - Consider user experience when setting notification frequencies

3. **URL Configuration**
   - Keep URLs consistent with your application's routing structure
   - Consider security implications when customizing URLs
   - Test WebSocket connections after URL changes
