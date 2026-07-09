from rest_framework import generics, status
from .models import CommentModel
from .serializers import CommentCreateSerializer, CommentFetchSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment_instance = serializer.save()
        broadcasting_serializer = CommentFetchSerializer(comment_instance)

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "comments_stream",
            {"type": "send_comment", "comment": broadcasting_serializer.data},
        )

        user = comment_instance.user
        refresh = RefreshToken()
        refresh["user_id"] = user.id
        refresh["username"] = user.username
        refresh["email"] = user.email

        return Response(
            {
                "comment": broadcasting_serializer.data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )
