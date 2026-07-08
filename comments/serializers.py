import bleach
import re
from rest_framework import serializers
from .models import UserModel, CommentModel


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModel
        fields = ["username", "email", "homepage"]

    def validate_username(self, value):
        if not re.match(r"^[a-zA-Z0-9]+$", value):
            raise serializers.ValidationError(
                "Username може містити лише латинські літери та цифри."
            )
        return value


class CommentCreateSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer()

    class Meta:
        model = CommentModel
        fields = ["user", "parent", "text", "file"]

    def validate_text(self, value):
        allowed_tags = ["a", "code", "i", "strong"]
        allowed_attributes = {"a": ["href", "title"]}

        cleaned_text = bleach.clean(
            value, tags=allowed_tags, attributes=allowed_attributes, strip=True
        )
        return cleaned_text

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        user, _ = UserModel.objects.get_or_create(
            username=user_data["username"],
            defaults={
                "email": user_data["email"],
                "homepage": user_data.get("homepage", ""),
            },
        )

        comment = CommentModel.objects.create(user=user, **validated_data)
        return comment


class CommentFetchSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = CommentModel
        fields = ["id", "user", "text", "file", "created_at", "replies"]

    def get_replies(self, obj):
        replies = obj.replies.all()
        return CommentFetchSerializer(replies, many=True).data
