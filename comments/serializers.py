import bleach
import re
from rest_framework import serializers
from .models import UserModel, CommentModel
from io import BytesIO
from django.core.files.images import get_image_dimensions
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
from django.core.cache import cache
from .tasks import optimize_comment_image
import xml.etree.ElementTree as ET
from rest_framework_simplejwt.tokens import RefreshToken
import os
import redis


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


class UserCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModel
        fields = ["username", "email", "homepage"]
        extra_kwargs = {
            "username": {"validators": []},
            "email": {"validators": []},
        }

    def validate_username(self, value):
        if not re.match(r"^[a-zA-Z0-9]+$", value):
            raise serializers.ValidationError(
                "Username може містити лише латинські літери та цифри."
            )
        return value


class CommentCreateSerializer(serializers.ModelSerializer):
    user = UserCommentSerializer()
    captcha_key = serializers.CharField(write_only=True)
    captcha_value = serializers.CharField(write_only=True)

    class Meta:
        model = CommentModel
        fields = ["user", "parent", "text", "file", "captcha_key", "captcha_value"]

    def validate_text(self, value):
        allowed_tags = ["a", "code", "i", "strong"]
        allowed_attributes = {"a": ["href", "title"]}

        wrapped_text = f"<div>{value}</div>"
        try:
            ET.fromstring(wrapped_text)
        except ET.ParseError:
            raise serializers.ValidationError(
                "Некоректний HTML/XHTML код. Перевірте правильність закриття та вкладеності тегів."
            )

        cleaned_text = bleach.clean(
            value, tags=allowed_tags, attributes=allowed_attributes, strip=True
        )

        return cleaned_text

    def validate(self, data):
        captcha_key = data.get("captcha_key")
        captcha_value = data.get("captcha_value")

        redis_key = f"captcha_{captcha_key}"

        redis_url = os.environ.get("REDIS_URL", "redis://redis:6379")
        r = redis.Redis.from_url(redis_url)

        correct_value_bytes = r.get(redis_key)

        if not correct_value_bytes:
            raise serializers.ValidationError(
                {"captcha_value": "Капча застаріла або не існує. Оновіть сторінку."}
            )

        correct_value = correct_value_bytes.decode("utf-8")

        if captcha_value.upper() != correct_value.upper():
            raise serializers.ValidationError(
                {"captcha_value": "Невірний код з картинки."}
            )

        r.delete(redis_key)

        data.pop("captcha_key")
        data.pop("captcha_value")

        return data

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        username = user_data["username"]
        email = user_data["email"]
        homepage = user_data.get("homepage", "")

        existing_user_by_email = UserModel.objects.filter(email__iexact=email).first()
        if existing_user_by_email and existing_user_by_email.username != username:
            raise serializers.ValidationError(
                {"user": {"email": f"Користувач з поштою '{email}' вже існує."}}
            )

        user, created = UserModel.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "homepage": homepage,
            },
        )

        if not created and user.email.lower() != email.lower():
            raise serializers.ValidationError(
                {
                    "user": {
                        "username": f"Нікнейм '{username}' вже зайнятий іншою поштою."
                    }
                }
            )

        comment = CommentModel.objects.create(user=user, **validated_data)

        if comment.file:
            optimize_comment_image.delay(comment.file.name)

        refresh = RefreshToken.for_user(user)
        refresh["username"] = user.username
        refresh["email"] = user.email

        self.context["tokens"] = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

        return comment

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if "tokens" in self.context:
            representation["tokens"] = self.context["tokens"]
        return representation

    def validate_file(self, file_obj):
        if not file_obj:
            return file_obj

        file_extension = file_obj.name.split(".")[-1].lower()

        if file_extension == "txt":
            if file_obj.size > 100 * 1024:
                raise serializers.ValidationError(
                    "Текстовий файл не повинен перевищувати 100 Кб."
                )
            return file_obj

        elif file_extension in ["jpg", "jpeg", "png", "gif"]:
            width, height = get_image_dimensions(file_obj)

            if not width or not height:
                raise serializers.ValidationError("Некоректний файл зображення.")

            if width > 320 or height > 240:
                img = Image.open(file_obj)
                img.thumbnail((320, 240))
                buffer = BytesIO()
                img.save(buffer, format=img.format if img.format else "JPEG")
                buffer.seek(0)
                file_obj = InMemoryUploadedFile(
                    buffer,
                    "FileField",
                    file_obj.name,
                    file_obj.content_type,
                    buffer.getbuffer().nbytes,
                    None,
                )
            return file_obj
        else:
            raise serializers.ValidationError(
                "Дозволені формати файлів: JPG, GIF, PNG, TXT."
            )


class CommentFetchSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    parent = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CommentModel
        fields = ["id", "user", "text", "file", "created_at", "parent", "replies"]

    def get_replies(self, obj):
        replies = obj.replies.all()
        return CommentFetchSerializer(replies, many=True).data
