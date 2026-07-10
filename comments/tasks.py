import os
from celery import shared_task
from django.core.files.storage import default_storage
from PIL import Image


@shared_task
def optimize_comment_image(file_path):
    if not default_storage.exists(file_path):
        return f"File {file_path} not found"

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".gif"]:
        return f"File {file_path} is not an image, skipping optimization"

    full_path = default_storage.path(file_path)

    try:
        with Image.open(full_path) as img:
            max_size = (320, 240)
            img.thumbnail(max_size)

            img.save(full_path, optimize=True, quality=85)

        return f"Successfully optimized image: {file_path}"
    except Exception as e:
        return f"Error optimizing image {file_path}: {str(e)}"
