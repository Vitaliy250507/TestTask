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
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": queryset.count(),
                "next": None,
                "previous": None,
                "results": serializer.data,
            }
        )

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
