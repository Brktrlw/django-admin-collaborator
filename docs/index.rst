Django Admin Collaborator
========================

Real-time collaborative editing for Django admin interfaces using WebSockets.

.. image:: https://raw.githubusercontent.com/Brktrlw/django-admin-collaborator/refs/heads/main/screenshots/demo.gif
   :alt: Demo
   :align: center

Overview
--------

Django Admin Collaborator enables real-time collaboration in Django admin interfaces,
allowing one user to edit while others view in real-time, preventing conflicts and ensuring data consistency.

Contents
--------

.. toctree::
   :maxdepth: 2
   :caption: Documentation

   installation
   usage

.. toctree::
   :maxdepth: 2
   :caption: Reference

   api

.. toctree::
   :maxdepth: 1
   :caption: Development

   contributing
   changelog

Features
--------

- ✨ **Real-time Collaborative Editing** - One user can edit while others view in real-time, preventing conflicts
- 🔒 **Edit Lock Management** - Prevents concurrent edits to the same object
- 👥 **User Presence Detection** - See who else is viewing the same object
- 🔔 **Editor Attention System** - Request attention from the current editor
- 💬 **Customizable Notifications** - Configure your own notification messages
- 👤 **Avatar Support** - Visual user identification with customizable avatars
- 🔌 **Redis Integration** - Reliable lock management and message distribution
- 🔄 **Django Channels** - WebSocket-based real-time communication

Indices and tables
=================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
