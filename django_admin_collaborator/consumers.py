import json
import datetime as dt
from typing import Dict, Any, Optional, cast

import redis
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class AdminCollaborationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time collaborative editing in Django admin.

    This consumer manages edit locks for admin model instances, ensuring only one
    staff user can edit a specific object at a time. It also broadcasts editing status
    and updates to all connected clients.

    Communication is coordinated through Redis for lock management and message distribution
    via Django Channels layer for WebSocket messaging.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize Redis client lazily
        self._redis_client = None

    @property
    def redis_client(self):
        """
        Lazily initialize the Redis client.

        Uses the REDIS_URL from settings, or a sensible default.
        """
        if not self._redis_client:
            redis_url = getattr(settings, 'ADMIN_COLLABORATOR_REDIS_URL',
                                getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0'))
            self._redis_client = redis.from_url(redis_url)
        return self._redis_client

    async def connect(self) -> None:
        """
        Handle WebSocket connection establishment.

        - Extracts model and object identifiers from URL
        - Authenticates the user
        - Sets up channel group for this specific object
        - Notifies other users about this user's presence
        - Retrieves and maintains last modified timestamp

        Closes the connection if user is not authorized.
        """
        # Get parameters from the URL
        self.app_label: str = self.scope['url_route']['kwargs']['app_label']
        self.model_name: str = self.scope['url_route']['kwargs']['model_name']
        self.object_id: str = self.scope['url_route']['kwargs']['object_id']

        # Perform authentication check with database_sync_to_async
        is_authorized: bool = await self.check_user_authorization()
        if not is_authorized:
            await self.close()
            return

        # Create a unique channel group name for this object
        self.room_group_name: str = f"admin_{self.app_label}_{self.model_name}_{self.object_id}"
        self.user_id: int = self.scope['user'].id
        self.email: str = self.scope['user'].email

        # Get avatar URL if configured
        avatar_url = None
        avatar_field = getattr(settings, 'ADMIN_COLLABORATOR_OPTIONS', {}).get('avatar_field')
        if avatar_field and hasattr(self.scope['user'], avatar_field):
            avatar = getattr(self.scope['user'], avatar_field)
            if avatar:
                avatar_url = avatar.url

        # Redis keys for this object
        self.editor_key: str = f"editor:{self.room_group_name}"
        self.last_modified_key: str = f"last_modified:{self.room_group_name}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Accept the WebSocket connection
        await self.accept()

        # Get and store the last modified timestamp if not already set
        if not self.redis_client.exists(self.last_modified_key):
            last_modified: str = self.get_timestamp()
            self.redis_client.set(self.last_modified_key, last_modified)

        # Get the current last_modified timestamp
        last_modified: str = self.redis_client.get(self.last_modified_key).decode('utf-8')

        # Notify the group about this user's presence
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user_id,
                'username': self.email,
                'timestamp': self.get_timestamp(),
                'last_modified': last_modified,
                'avatar_url': avatar_url
            }
        )

    @database_sync_to_async
    def check_user_authorization(self) -> bool:
        """
        Validate user is authenticated and has staff permissions.

        This method runs in a thread pool to properly manage database connections.

        Returns:
            bool: True if user is authenticated and has staff permissions, False otherwise
        """
        user = cast(User, self.scope['user'])
        return user.is_authenticated and user.is_staff

    def get_timestamp(self) -> str:
        """
        Generate a UTC ISO format timestamp.

        Returns:
            str: Current UTC time in ISO format with timezone info
        """
        return timezone.now().astimezone(dt.timezone.utc).isoformat()

    @database_sync_to_async
    def get_last_modified(self) -> str:
        """
        Retrieve the last modified timestamp for the current object.

        This is a placeholder that should be implemented based on your actual model.
        Default implementation returns current timestamp.

        Returns:
            str: Last modified timestamp in ISO format
        """
        return self.get_timestamp()

    async def disconnect(self, close_code: int) -> None:
        """
        Handle WebSocket disconnection.

        - Removes user from the editor role if they were the active editor
        - Notifies other users about this user leaving
        - Leaves the channel group
        - Stores editor ID as previous editor to allow reclaiming on reconnection

        Args:
            close_code (int): WebSocket close code
        """
        try:
            if hasattr(self, 'room_group_name'):
                # First, check if this user was the editor and capture that information
                is_editor = False
                editor_data: Optional[bytes] = self.redis_client.get(self.editor_key)
                if editor_data:
                    editor_info: Dict[str, Any] = json.loads(editor_data)
                    if editor_info.get('editor_id') == self.user_id:
                        # Clear editor for this room
                        self.redis_client.delete(self.editor_key)
                        is_editor = True

                        # Store this editor ID as the previous editor to allow reclaiming on reconnection
                        previous_editor_key = f"previous_editor:{self.room_group_name}"
                        self.redis_client.setex(
                            previous_editor_key,
                            dt.timedelta(minutes=5),  # 5-minute grace period for reconnection
                            str(self.user_id)
                        )

                # Prepare message data before leaving the group
                message_data = {
                    'type': 'user_left',
                    'user_id': self.user_id,
                    'username': self.email,
                }

                # Send messages to group (before we leave the group)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    message_data
                )

                # Send lock_released message if we were the editor
                if is_editor:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'lock_released',
                            'user_id': self.user_id,
                            'username': self.email,
                        }
                    )

                # Now leave the group - do this after sending messages but before potential exception handling
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
        except Exception as e:
            logger.exception(f"Error during disconnect: {e}")

    async def receive(self, text_data: str) -> None:
        """
        Process incoming WebSocket messages.

        Routes each message to the appropriate handler based on its type.

        Args:
            text_data (str): JSON string containing the message data
        """
        try:
            data: Dict[str, Any] = json.loads(text_data)
            message_type: str = data.get('type')

            if message_type == 'request_editor_status':
                await self.handle_editor_status_request()
            elif message_type == 'claim_editor':
                await self.handle_claim_editor(data.get('timestamp'))
            elif message_type == 'heartbeat':
                await self.handle_heartbeat()
            elif message_type == 'content_updated':
                await self.handle_content_updated(data.get('timestamp'))
            elif message_type == 'release_lock':
                await self.handle_release_lock()
            elif message_type == 'request_attention':
                await self.handle_request_attention()
        except Exception as e:
            logger.exception(f"Error processing message: {e}")

    async def handle_editor_status_request(self) -> None:
        """
        Handle requests for the current editor status.

        Checks Redis for current editor information and sends it to the requester.
        If the current editor hasn't sent a heartbeat recently, clears the editor lock.
        """
        # Get current editor status from Redis
        editor_data: Optional[bytes] = self.redis_client.get(self.editor_key)
        editor_id: Optional[int] = None
        editor_name: Optional[str] = None

        if editor_data:
            editor_info: Dict[str, Any] = json.loads(editor_data)
            # Check if the editor's heartbeat is recent (within last 2 minutes)
            try:
                # Parse the ISO format timestamp into a datetime object with UTC timezone
                last_heartbeat: dt.datetime = dt.datetime.fromisoformat(editor_info['last_heartbeat'])
                current_time: dt.datetime = timezone.now().astimezone(dt.timezone.utc)

                # Using timedelta directly instead of timezone.now() to avoid DB connections
                if current_time - last_heartbeat > dt.timedelta(minutes=2):
                    # Editor timed out
                    self.redis_client.delete(self.editor_key)
                else:
                    editor_id = editor_info['editor_id']
                    editor_name = editor_info['editor_name']
            except (ValueError, TypeError):
                # Handle invalid timestamp format
                self.redis_client.delete(self.editor_key)

        await self.send(text_data=json.dumps({
            'type': 'editor_status',
            'editor_id': editor_id,
            'editor_name': editor_name,
        }))

    async def handle_claim_editor(self, timestamp: Optional[str]) -> None:
        """
        Process a request to claim editor status for the current object.

        Only assigns editor status if no other user currently has it.
        Sets a 3-minute expiration on the editor lock to handle disconnections.
        Gives priority to the previous editor during reconnection for a short grace period.

        Args:
            timestamp (Optional[str]): Optional timestamp string in ISO format
        """
        # Use a Redis transaction to protect against race conditions during editor claiming
        # Get current editor data and previous editor data atomically
        pipeline = self.redis_client.pipeline()
        editor_key = self.editor_key
        previous_editor_key = f"previous_editor:{self.room_group_name}"

        pipeline.get(editor_key)
        pipeline.get(previous_editor_key)
        editor_data_bytes, previous_editor_data_bytes = pipeline.execute()

        previous_editor_id = None
        if previous_editor_data_bytes:
            try:
                previous_editor_id = int(previous_editor_data_bytes.decode('utf-8'))
            except (ValueError, TypeError):
                previous_editor_id = None

        # Check if this user is the previous editor
        is_previous_editor = previous_editor_id == self.user_id

        # Attempt to claim editor status based on conditions
        if editor_data_bytes:
            # There's already an active editor
            editor_info = json.loads(editor_data_bytes)
            current_editor_id = editor_info.get('editor_id')

            # Only allow reclaiming if this user was the previous editor and is not the current active editor
            if is_previous_editor and current_editor_id != self.user_id:
                # Record new editor session with reclaim
                editor_info = {
                    'editor_id': self.user_id,
                    'editor_name': self.email,
                    'last_heartbeat': self.get_timestamp(),
                    'reclaimed': True  # Mark as a reclaimed session
                }

                # Use a Redis transaction to update the editor
                pipeline = self.redis_client.pipeline()
                pipeline.setex(
                    editor_key,
                    dt.timedelta(minutes=3),
                    json.dumps(editor_info)
                )
                pipeline.delete(previous_editor_key)  # Clear previous editor key
                pipeline.execute()

                # Broadcast the new editor status
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'editor_status',
                        'editor_id': self.user_id,
                        'editor_name': self.email,
                    }
                )

                logger.info(f"User {self.user_id} ({self.email}) reclaimed editor status")
        else:
            # No active editor
            editor_info = {
                'editor_id': self.user_id,
                'editor_name': self.email,
                'last_heartbeat': self.get_timestamp()
            }

            # Give priority to previous editors during claim attempts
            # If this user was the previous editor, set the editor immediately
            # Otherwise, check if there's a grace period for a previous editor that might reconnect
            if is_previous_editor:
                # This was the previous editor - claim immediately
                pipeline = self.redis_client.pipeline()
                pipeline.setex(
                    editor_key,
                    dt.timedelta(minutes=3),
                    json.dumps(editor_info)
                )
                pipeline.delete(previous_editor_key)  # Clear previous editor key
                pipeline.execute()

                # Broadcast the new editor status
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'editor_status',
                        'editor_id': self.user_id,
                        'editor_name': self.email,
                    }
                )

                logger.info(f"Previous editor {self.user_id} ({self.email}) claimed editor status")
            elif not previous_editor_id:
                # No previous editor or grace period expired - new user can claim
                pipeline = self.redis_client.pipeline()
                pipeline.setex(
                    editor_key,
                    dt.timedelta(minutes=3),
                    json.dumps(editor_info)
                )
                pipeline.execute()

                # Broadcast the new editor status
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'editor_status',
                        'editor_id': self.user_id,
                        'editor_name': self.email,
                    }
                )

                logger.info(f"New editor {self.user_id} ({self.email}) claimed editor status")

    async def handle_heartbeat(self) -> None:
        """
        Process heartbeat messages from the active editor.

        Updates the last heartbeat timestamp and resets the expiration time
        for the editor lock in Redis. Only processes heartbeats from the
        current editor.

        Also stores the current editor ID as the previous editor with a longer
        expiration time to handle temporary disconnections.
        """
        # Update last heartbeat time for the current editor
        editor_data: Optional[bytes] = self.redis_client.get(self.editor_key)
        if editor_data:
            editor_info: Dict[str, Any] = json.loads(editor_data)
            if editor_info.get('editor_id') == self.user_id:
                editor_info['last_heartbeat'] = self.get_timestamp()
                # Reset the expiration time with increased duration (3 minutes instead of 2)
                self.redis_client.setex(
                    self.editor_key,
                    dt.timedelta(minutes=3), 
                    json.dumps(editor_info)
                )

                # Store this editor ID as the previous editor with a longer grace period (10 minutes)
                # This helps with reconnection to reclaim editor status
                previous_editor_key = f"previous_editor:{self.room_group_name}"
                self.redis_client.setex(
                    previous_editor_key,
                    dt.timedelta(minutes=10),
                    str(self.user_id)
                )

    async def handle_content_updated(self, timestamp: Optional[str]) -> None:
        """
        Process content update notifications.

        Updates the last modified timestamp and notifies all connected clients
        that content has changed.

        Args:
            timestamp (Optional[str]): Optional timestamp string in ISO format
        """
        # Use provided timestamp if valid, otherwise generate new one
        if timestamp:
            try:
                # Ensure timestamp is in the expected format
                dt.datetime.fromisoformat(timestamp)
                new_timestamp: str = timestamp
            except (ValueError, TypeError):
                new_timestamp = self.get_timestamp()
        else:
            new_timestamp = self.get_timestamp()

        # Update the last modified timestamp
        self.redis_client.set(self.last_modified_key, new_timestamp)

        # Notify all clients that content has been updated
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'content_updated',
                'user_id': self.user_id,
                'username': self.email,
                'timestamp': new_timestamp
            }
        )

    async def handle_release_lock(self) -> None:
        """
        Process a request to release the editor lock.

        Only allows the current editor to release their own lock.
        Updates the last modified timestamp and notifies all clients
        that the lock has been released.
        """
        # Only allow the current editor to release the lock
        editor_data: Optional[bytes] = self.redis_client.get(self.editor_key)
        if editor_data:
            editor_info: Dict[str, Any] = json.loads(editor_data)
            if editor_info.get('editor_id') == self.user_id:
                # Clear the editor
                self.redis_client.delete(self.editor_key)

                # Since this is a deliberate release, also clear previous editor record
                previous_editor_key = f"previous_editor:{self.room_group_name}"
                self.redis_client.delete(previous_editor_key)

                # Get the latest data timestamp
                latest_timestamp: str = await self.get_last_modified()
                self.redis_client.set(self.last_modified_key, latest_timestamp)

                # Notify all clients that the lock has been released
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'lock_released',
                        'user_id': self.user_id,
                        'username': self.email,
                        'timestamp': latest_timestamp
                    }
                )

    async def handle_request_attention(self) -> None:
        """
        Process a request for the editor's attention from a viewer.

        Checks if the user can send a notification based on rate limiting,
        then forwards the request to the current editor.
        """
        # Get current editor status from Redis
        editor_data: Optional[bytes] = self.redis_client.get(self.editor_key)

        if not editor_data:
            # No editor to notify
            return

        editor_info: Dict[str, Any] = json.loads(editor_data)
        editor_id = editor_info.get('editor_id')

        if editor_id == self.user_id:
            # User is the editor, no need to notify self
            return

        # Rate limiting key specific to this user for this object
        rate_limit_key = f"attention_request:{self.room_group_name}:{self.user_id}"

        # Get the notification interval from settings (default 15 seconds)
        notification_interval = getattr(
            settings,
            'ADMIN_COLLABORATOR_OPTIONS',
            {}
        ).get('notification_request_interval', 15)

        # Check if user has sent a request recently
        if self.redis_client.exists(rate_limit_key):
            # Too soon to send another request
            return

        # Set rate limiting key with expiration
        self.redis_client.setex(
            rate_limit_key,
            notification_interval,  # Expires after the configured interval
            1
        )

        # Notify the editor
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'attention_requested',
                'user_id': self.user_id,
                'username': self.email,
                'timestamp': self.get_timestamp()
            }
        )

    # Event handlers for channel layer messages

    async def user_joined(self, event: Dict[str, Any]) -> None:
        """
        Handle user_joined events from the channel layer.

        Args:
            event (Dict[str, Any]): Event data including user_id, username, and timestamp
        """
        await self.send(text_data=json.dumps(event))

    async def user_left(self, event: Dict[str, Any]) -> None:
        """
        Handle user_left events from the channel layer.

        Args:
            event (Dict[str, Any]): Event data including user_id and username
        """
        await self.send(text_data=json.dumps(event))

    async def editor_status(self, event: Dict[str, Any]) -> None:
        """
        Handle editor_status events from the channel layer.

        Args:
            event (Dict[str, Any]): Event data including editor_id and editor_name
        """
        await self.send(text_data=json.dumps(event))

    async def content_updated(self, event: Dict[str, Any]) -> None:
        """
        Handle content_updated events from the channel layer.

        Args:
            event (Dict[str, Any]): Event data including user_id, username, and timestamp
        """
        await self.send(text_data=json.dumps(event))

    async def lock_released(self, event: Dict[str, Any]) -> None:
        """
        Handle lock_released events from the channel layer.

        Args:
            event (Dict[str, Any]): Event data including user_id, username, and timestamp
        """
        await self.send(text_data=json.dumps(event))

    async def attention_requested(self, event: Dict[str, Any]) -> None:
        """
        Handle attention_requested events from the channel layer.

        Args:
            event (Dict[str, Any]): Event data including user_id, username, and timestamp
        """
        await self.send(text_data=json.dumps(event))


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat between users on the same page.

    This consumer manages presence tracking and message routing between users
    viewing the same page in the Django admin interface.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize Redis client lazily
        self._redis_client = None

    @property
    def redis_client(self):
        """
        Lazily initialize the Redis client.

        Uses the REDIS_URL from settings, or a sensible default.
        """
        if not self._redis_client:
            redis_url = getattr(settings, 'ADMIN_COLLABORATOR_REDIS_URL',
                              getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0'))
            self._redis_client = redis.from_url(redis_url)
        return self._redis_client

    async def connect(self) -> None:
        """
        Handle WebSocket connection establishment.

        - Extracts current page path from URL
        - Authenticates the user
        - Sets up channel group for users on this page
        - Adds user to the presence list
        - Notifies other users about this user's presence
        """
        # Get parameters from the URL
        self.page_path = self.scope['url_route']['kwargs']['page_path']

        # Perform authentication check
        is_authorized: bool = await self.check_user_authorization()
        if not is_authorized:
            await self.close()
            return

        # Create a unique channel group name for this page
        self.room_group_name: str = f"chat_{self.page_path}"
        self.user_id: int = self.scope['user'].id
        self.username: str = self.scope['user'].username
        self.email: str = self.scope['user'].email

        # Get avatar URL if configured
        self.avatar_url = None
        avatar_field = getattr(settings, 'ADMIN_COLLABORATOR_OPTIONS', {}).get('avatar_field')
        if avatar_field and hasattr(self.scope['user'], avatar_field):
            avatar = getattr(self.scope['user'], avatar_field)
            if avatar:
                self.avatar_url = avatar.url

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Accept the WebSocket connection
        await self.accept()

        # Save active users in Redis with expiration
        active_users_key = f"chat_active_users:{self.room_group_name}"
        user_data = json.dumps({
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'avatar_url': self.avatar_url,
            'last_seen': self.get_timestamp()
        })
        self.redis_client.hset(active_users_key, self.user_id, user_data)

        # Get all active users
        active_users = self.redis_client.hgetall(active_users_key)
        users_list = []
        for user_id, user_data in active_users.items():
            if user_id != str(self.user_id).encode():  # Exclude self
                users_list.append(json.loads(user_data))

        # Send active users list to the new user
        await self.send(text_data=json.dumps({
            'type': 'active_users',
            'users': users_list
        }))

        # Notify others about this user's presence
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user_id,
                'username': self.username,
                'email': self.email,
                'avatar_url': self.avatar_url,
                'timestamp': self.get_timestamp()
            }
        )

    @database_sync_to_async
    def check_user_authorization(self) -> bool:
        """
        Validate user is authenticated and has staff permissions.

        Returns:
            bool: True if user is authenticated and has staff permissions, False otherwise
        """
        user = cast(User, self.scope['user'])
        return user.is_authenticated and user.is_staff

    def get_timestamp(self) -> str:
        """
        Generate a UTC ISO format timestamp.

        Returns:
            str: Current UTC time in ISO format with timezone info
        """
        return timezone.now().astimezone(dt.timezone.utc).isoformat()

    async def disconnect(self, close_code: int) -> None:
        """
        Handle WebSocket disconnection.

        - Removes user from active users list
        - Notifies other users about this user leaving
        - Leaves the channel group
        """
        try:
            if hasattr(self, 'room_group_name'):
                # Remove user from active users in Redis
                active_users_key = f"chat_active_users:{self.room_group_name}"
                self.redis_client.hdel(active_users_key, self.user_id)

                # Notify the group that the user has left (before leaving the group)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'user_id': self.user_id,
                        'username': self.username,
                        'email': self.email
                    }
                )

                # Leave room group (after sending messages)
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
        except Exception as e:
            logger.exception(f"Error during disconnect: {e}")

    async def receive(self, text_data: str) -> None:
        """
        Process incoming WebSocket messages.

        Routes each message to the appropriate handler based on its type.

        Args:
            text_data (str): JSON string containing the message data
        """
        try:
            data: Dict[str, Any] = json.loads(text_data)
            message_type: str = data.get('type')

            if message_type == 'chat_message':
                await self.handle_chat_message(
                    data.get('recipient_id'),
                    data.get('message')
                )
            elif message_type == 'heartbeat':
                await self.handle_heartbeat()
        except Exception as e:
            logger.exception(f"Error processing message: {e}")

    async def handle_chat_message(self, recipient_id: int, message: str) -> None:
        """
        Process and route chat messages between users.

        Args:
            recipient_id (int): ID of the user receiving the message
            message (str): Content of the chat message
        """
        if not message or not recipient_id:
            return

        timestamp = self.get_timestamp()

        # Send to recipient and sender (so both see the message)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'sender_id': self.user_id,
                'sender_name': self.username,
                'sender_email': self.email,
                'sender_avatar': self.avatar_url,
                'recipient_id': recipient_id,
                'message': message,
                'timestamp': timestamp
            }
        )

    async def handle_heartbeat(self) -> None:
        """
        Process heartbeat messages to keep track of active users.

        Updates the user's last_seen timestamp in Redis
        """
        # Update user's last seen timestamp
        active_users_key = f"chat_active_users:{self.room_group_name}"
        user_data = json.dumps({
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'avatar_url': self.avatar_url,
            'last_seen': self.get_timestamp()
        })
        self.redis_client.hset(active_users_key, self.user_id, user_data)

    async def user_joined(self, event: Dict[str, Any]) -> None:
        """
        Handle user_joined events and relay to the WebSocket.

        Args:
            event (Dict[str, Any]): Event data containing user information
        """
        # Forward the event to the WebSocket
        await self.send(text_data=json.dumps(event))

    async def user_left(self, event: Dict[str, Any]) -> None:
        """
        Handle user_left events and relay to the WebSocket.

        Args:
            event (Dict[str, Any]): Event data containing user information
        """
        # Forward the event to the WebSocket
        await self.send(text_data=json.dumps(event))

    async def chat_message(self, event: Dict[str, Any]) -> None:
        """
        Handle chat_message events and relay to the WebSocket.

        Args:
            event (Dict[str, Any]): Event data containing message information
        """
        # Only send the message to the sender and recipient
        if self.user_id == event['sender_id'] or self.user_id == event['recipient_id']:
            await self.send(text_data=json.dumps(event))
