from rest_framework import generics, status
from .models import CommentModel
from .serializers import CommentCreateSerializer, CommentFetchSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from django.conf import settings
from rest_framework.filters import OrderingFilter


CACHE_KEY_COMMENTS = "comments_tree_cache"


class CommentListCreateView(generics.ListCreateAPIView):
    filter_backends = [OrderingFilter]
    ordering_fields = ["user__username", "user__email", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return CommentModel.objects.filter(parent__isnull=True).select_related("user")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CommentCreateSerializer
        return CommentFetchSerializer

    def list(self, request, *args, **kwargs):
        current_ordering = request.query_params.get("ordering", "-created_at")

        cache_key = f"comments_tree_cache_{current_ordering}"

        cached_comments = cache.get(cache_key)
        if cached_comments is not None:
            return Response(cached_comments)

        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        cache.set(cache_key, data, settings.CACHE_TTL)
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
        cache.delete("comments_tree_cache_-created_at")
        cache.delete("comments_tree_cache_created_at")
        cache.delete("comments_tree_cache_user__username")
        cache.delete("comments_tree_cache_-user__username")
        cache.delete("comments_tree_cache_user__email")
        cache.delete("comments_tree_cache_-user__email")

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
