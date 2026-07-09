import bleach
import re
from rest_framework import serializers
from .models import UserModel, CommentModel
from io import BytesIO
from django.core.files.images import get_image_dimensions
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
from django.core.cache import cache


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
    captcha_key = serializers.CharField(write_only=True)
    captcha_value = serializers.CharField(write_only=True)

    class Meta:
        model = CommentModel
        fields = ["user", "parent", "text", "file", "captcha_key", "captcha_value"]

    def validate_text(self, value):
        allowed_tags = ["a", "code", "i", "strong"]
        allowed_attributes = {"a": ["href", "title"]}

        cleaned_text = bleach.clean(
            value, tags=allowed_tags, attributes=allowed_attributes, strip=True
        )
        return cleaned_text

    def validate(self, data):
        captcha_key = data.get("captcha_key")
        captcha_value = data.get("captcha_value")

        redis_key = f"captcha_{captcha_key}"
        correct_value = cache.get(redis_key)

        if not correct_value:
            raise serializers.ValidationError(
                {"captcha_value": "Капча застаріла або не існує. Оновіть сторінку."}
            )

        if captcha_value.upper() != correct_value.upper():
            raise serializers.ValidationError(
                {"captcha_value": "Невірний код з картинки."}
            )

        cache.delete(redis_key)

        data.pop("captcha_key")
        data.pop("captcha_value")

        return data

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

    class Meta:
        model = CommentModel
        fields = ["id", "user", "text", "file", "created_at", "replies"]

    def get_replies(self, obj):
        replies = obj.replies.all()
        return CommentFetchSerializer(replies, many=True).data
