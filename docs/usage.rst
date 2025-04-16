Usage
=====

Basic Usage
----------

To enable collaborative editing for a specific admin class, inherit from the ``CollaborativeAdminMixin`` and register your model:

.. code-block:: python

    from django.contrib import admin
    from django_admin_collaborator.utils import CollaborativeAdminMixin
    from myapp.models import MyModel

    @admin.register(MyModel)
    class MyModelAdmin(CollaborativeAdminMixin, admin.ModelAdmin):
        list_display = ('name', 'description')
        # ... your other admin configurations

Avatar Configuration
------------------

The collaborative editor supports user avatars and rich tooltips. To enable this feature, you need to:

1. Add an ImageField to your User model (or use an existing one)
2. Configure the avatar field in your settings:

.. code-block:: python

    ADMIN_COLLABORATOR_OPTIONS = {
        # ... other options ...
        "avatar_field": "profile_picture"  # Name of the field containing the user's avatar image
    }

If no avatar is available, the system will display the user's initials instead. When hovering over an avatar, you'll see a tooltip showing:
- User's name
- User's email (if available)

Advanced Usage
------------

Applying to Multiple Admin Classes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can use the utility functions to apply collaborative editing to existing admin classes:

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

Creating Admin Classes Dynamically
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can use the factory function to create admin classes dynamically:

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