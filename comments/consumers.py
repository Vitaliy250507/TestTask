import json
from channels.generic.websocket import AsyncWebsocketConsumer


class CommentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "comments_stream"

        await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_comment(self, event):
        comment_data = event["comment"]

        await self.send(
            text_data=json.dumps({"type": "new_comment", "comment": comment_data})
        )
