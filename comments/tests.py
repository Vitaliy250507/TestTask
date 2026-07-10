from django.urls import reverse
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase
from .models import CommentModel, UserModel


class CommentAPITests(APITestCase):
    def setUp(self):
        self.url = reverse("comment-list-create")

        self.captcha_key = "test_key_123"
        self.captcha_value = "XZ45"
        cache.set(f"captcha_{self.captcha_key}", self.captcha_value, timeout=60)

        self.valid_payload = {
            "user": {
                "username": "tester",
                "email": "test@example.com",
                "homepage": "https://test.com",
            },
            "text": "This is a clean comment!",
            "captcha_key": self.captcha_key,
            "captcha_value": self.captcha_value,
        }

    def tearDown(self):
        cache.clear()

    def test_create_comment_success_with_jwt_returned(self):
        """Перевіряємо успішне створення коментаря, юзера та генерацію JWT токенів"""

        response = self.client.post(self.url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("comment", response.data)
        self.assertIn("tokens", response.data)
        self.assertIn("access", response.data["tokens"])

        self.assertTrue(UserModel.objects.filter(email="test@example.com").exists())
        self.assertTrue(
            CommentModel.objects.filter(text="This is a clean comment!").exists()
        )

    def test_create_comment_invalid_captcha(self):
        """Перевіряємо, що з неправильною капчею коментар не створиться"""

        payload = self.valid_payload.copy()
        payload["captcha_value"] = "WRONG"

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("captcha_value", response.data)
        self.assertEqual(CommentModel.objects.count(), 0)

    def test_xss_protection_cleans_dangerous_tags(self):
        """Перевіряємо, що шкідливі HTML-теги автоматично видаляються (bleach)"""

        payload = self.valid_payload.copy()

        payload["text"] = "<strong>Valid text</strong><script>alert('hack')</script>"

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        comment = CommentModel.objects.first()
        self.assertEqual(comment.text, "<strong>Valid text</strong>alert('hack')")

    def test_get_comments_list_caches_response(self):
        """Перевіряємо, що GET запит успішно працює і кешує дані в Redis"""

        user = UserModel.objects.create(username="john", email="john@example.com")
        CommentModel.objects.create(user=user, text="Database comment")

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        from .views import CACHE_KEY_COMMENTS

        self.assertIsNotNone(cache.get(CACHE_KEY_COMMENTS))

    def test_comments_list_returns_only_root_comments_with_nested_replies(self):
        """Перевіряємо, що GET-запит повертає лише батьківські коментарі, а відповіді йдуть вкладеними"""

        user = UserModel.objects.create(username="alex", email="alex@example.com")
        root_comment = CommentModel.objects.create(
            user=user, text="I am a root comment"
        )

        CommentModel.objects.create(
            user=user, text="I am a nested reply", parent=root_comment
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["text"], "I am a root comment")
