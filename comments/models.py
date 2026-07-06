from django.db import models

# Create your models here.


class UserModel(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    homepage = models.URLField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.username


class CommentModel(models.Model):
    user = models.ForeignKey(
        UserModel, on_delete=models.CASCADE, related_name="comments"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, blank=True, null=True, related_name="replies"
    )
    text = models.TextField()
    file = models.FileField(upload_to="comments_files/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"Comment by {self.user.username} at {self.created_at}"
