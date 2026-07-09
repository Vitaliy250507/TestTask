from django.urls import path
from .views import CaptchaGenerateView

urlpatterns = [
    path("captcha/", CaptchaGenerateView.as_view(), name="captcha-generate"),
]
