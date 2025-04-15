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