from django.urls import path
from django.conf import settings
from django_admin_collaborator.consumers import AdminCollaborationConsumer, ChatConsumer
from django_admin_collaborator.defaults import get_admin_collaborator_websocket_connection_prefix_url


websocket_urlpatterns = [
    path(f'{get_admin_collaborator_websocket_connection_prefix_url()}/<str:app_label>/<str:model_name>/<str:object_id>/',
         AdminCollaborationConsumer.as_asgi()),
    path(f'{get_admin_collaborator_websocket_connection_prefix_url()}/chat/<path:page_path>/',
         ChatConsumer.as_asgi()),
]
