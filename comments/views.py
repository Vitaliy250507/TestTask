from rest_framework import generics, status
from .models import CommentModel
from .serializers import CommentCreateSerializer, CommentFetchSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from django.conf import settings


CACHE_KEY_COMMENTS = "comments_tree_cache"


class CommentListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return CommentModel.objects.filter(parent__isnull=True).select_related("user")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CommentCreateSerializer
        return CommentFetchSerializer

    def list(self, request, *args, **kwargs):
        cached_comments = cache.get(CACHE_KEY_COMMENTS)

        if cached_comments is not None:
            return Response(cached_comments)

        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        cache.set(CACHE_KEY_COMMENTS, data, settings.CACHE_TTL)

        return Response(data)

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

        cache.delete(CACHE_KEY_COMMENTS)

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
