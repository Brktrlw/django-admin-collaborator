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
- 💬 **Real-time Chat System** - Chat with other users viewing the same page
  - Individual chat windows for each user
  - Online status indicators
  - Customizable chat interface text
  - User list panel with online status
- 👤 **Avatar Support** - Visual user identification with customizable avatars
- 🔌 **Redis Integration** - Reliable lock management and message distribution
- 🔄 **Django Channels** - WebSocket-based real-time communication

Chat System Features
------------------

The chat system provides a comprehensive set of features for real-time communication:

- **User List Panel**
  - Shows all users currently viewing the same page
  - Displays online status with customizable text
  - Click to start a conversation with any user

- **Individual Chat Windows**
  - Open multiple chat windows simultaneously
  - Minimize/maximize chat windows
  - Clear message history when closed

- **Customizable Interface**
  - Configure all text elements through settings

- **Real-time Updates**
  - Instant message delivery
  - Live user presence updates
  - Automatic window management

Indices and tables
=================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
