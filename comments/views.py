from rest_framework import generics
from .models import CommentModel
from .serializers import CommentCreateSerializer, CommentFetchSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class CommentListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return CommentModel.objects.filter(parent__isnull=True).select_related("user")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CommentCreateSerializer
        return CommentFetchSerializer

    def perform_create(self, serializer):
        instance = serializer.save()

        broadcasting_serializer = CommentFetchSerializer(instance)

        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            "comments_stream",
            {"type": "send_comment", "comment": broadcasting_serializer.data},
        )
