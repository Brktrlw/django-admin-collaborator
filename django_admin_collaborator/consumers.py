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

        Args:
            close_code (int): WebSocket close code
        """
        try:
            if hasattr(self, 'room_group_name'):
                # Check if this user was the editor
                editor_data: Optional[bytes] = self.redis_client.get(self.editor_key)
                if editor_data:
                    editor_info: Dict[str, Any] = json.loads(editor_data)
                    if editor_info.get('editor_id') == self.user_id:
                        # Clear editor for this room
                        self.redis_client.delete(self.editor_key)

                        # Notify the group that the editor has left
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'user_left',
                                'user_id': self.user_id,
                                'username': self.email,
                            }
                        )

                        # Also send specific lock_released message
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'lock_released',
                                'user_id': self.user_id,
                                'username': self.email,
                            }
                        )
                    else:
                        # Just a regular user leaving
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'user_left',
                                'user_id': self.user_id,
                                'username': self.email,
                            }
                        )
                else:
                    # Just a regular user leaving
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'user_left',
                            'user_id': self.user_id,
                            'username': self.email,
                        }
                    )

                # Leave room group
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
        Sets a 2-minute expiration on the editor lock to handle disconnections.

        Args:
            timestamp (Optional[str]): Optional timestamp string in ISO format
        """
        # Only allow claiming if there's no current editor
        editor_data: Optional[bytes] = self.redis_client.get(self.editor_key)

        if not editor_data:
            # Set this user as the editor with a 2-minute expiration (in case of disconnection)
            editor_info: Dict[str, Any] = {
                'editor_id': self.user_id,
                'editor_name': self.email,
                'last_heartbeat': self.get_timestamp()
            }
            self.redis_client.setex(
                self.editor_key,
                dt.timedelta(minutes=2),  # Auto-expire after 2 minutes without heartbeat
                json.dumps(editor_info)
            )

            # Broadcast the new editor status
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'editor_status',
                    'editor_id': self.user_id,
                    'editor_name': self.email,
                }
            )

    async def handle_heartbeat(self) -> None:
        """
        Process heartbeat messages from the active editor.

        Updates the last heartbeat timestamp and resets the expiration time
        for the editor lock in Redis. Only processes heartbeats from the
        current editor.
        """
        # Update last heartbeat time for the current editor
        editor_data: Optional[bytes] = self.redis_client.get(self.editor_key)
        if editor_data:
            editor_info: Dict[str, Any] = json.loads(editor_data)
            if editor_info.get('editor_id') == self.user_id:
                editor_info['last_heartbeat'] = self.get_timestamp()
                # Reset the expiration time
                self.redis_client.setex(
                    self.editor_key,
                    dt.timedelta(minutes=2),
                    json.dumps(editor_info)
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
