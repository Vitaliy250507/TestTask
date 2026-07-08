from rest_framework import generics
from .models import CommentModel
from .serializers import CommentCreateSerializer, CommentFetchSerializer


class CommentListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return CommentModel.objects.filter(parent__isnull=True).select_related("user")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CommentCreateSerializer
        return CommentFetchSerializer
