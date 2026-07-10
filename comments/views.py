from rest_framework import generics, status
from .models import CommentModel
from .serializers import CommentCreateSerializer, CommentFetchSerializer
from rest_framework.pagination import PageNumberPagination
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from django.conf import settings
from rest_framework.filters import OrderingFilter


CACHE_KEY_COMMENTS = "comments_tree_cache"


class CommentPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class CommentListCreateView(generics.ListCreateAPIView):
    filter_backends = [OrderingFilter]
    ordering_fields = ["user__username", "user__email", "created_at"]
    ordering = ["-created_at"]
    pagination_class = CommentPagination

    def get_queryset(self):
        return CommentModel.objects.filter(parent__isnull=True).select_related("user")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CommentCreateSerializer
        return CommentFetchSerializer

    def list(self, request, *args, **kwargs):
        current_ordering = request.query_params.get("ordering", "-created_at")
        current_page = request.query_params.get("page", "1")

        cache_key = f"comments_tree_cache_{current_ordering}_page_{current_page}"

        cached_comments = cache.get(cache_key)
        if cached_comments is not None:
            return Response(cached_comments)

        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)

            cache.set(cache_key, paginated_response.data, settings.CACHE_TTL)
            return paginated_response

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

        cache.delete_pattern("comments_tree_cache_*")
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
