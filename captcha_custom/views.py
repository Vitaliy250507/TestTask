import random
import string
import uuid
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django_redis import get_redis_connection


class CaptchaGenerateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        captcha_text = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=4)
        )
        captcha_key = str(uuid.uuid4())
        redis_key = f"captcha_{captcha_key}"

        con = get_redis_connection("default")
        con.setex(redis_key, 300, captcha_text)
        width, height = 120, 45
        image = Image.new("RGB", (width, height), color=(240, 240, 240))
        draw = ImageDraw.Draw(image)

        for _ in range(5):
            draw.line(
                [
                    (random.randint(0, width), random.randint(0, height)),
                    (random.randint(0, width), random.randint(0, height)),
                ],
                fill=(
                    random.randint(100, 200),
                    random.randint(100, 200),
                    random.randint(100, 200),
                ),
                width=1,
            )

        font = ImageFont.load_default()
        for i, char in enumerate(captcha_text):
            draw.text(
                (15 + i * 25, random.randint(10, 20)),
                char,
                fill=(50, 50, 50),
                font=font,
            )

        buffer = BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)

        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return Response(
            {
                "captcha_key": captcha_key,
                "captcha_image": f"data:image/png;base64,{image_base64}",
            },
            status=status.HTTP_200_OK,
        )
