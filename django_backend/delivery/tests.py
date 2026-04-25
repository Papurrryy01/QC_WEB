import json
import os
from unittest.mock import patch

from django.test import Client, TestCase


class SendMomentApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/moments/send/"

    def test_rejects_missing_fields(self):
        response = self.client.post(
            self.url,
            data=json.dumps({}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(
            response.content,
            {"ok": False, "error": "recipient_phone is required"},
        )

    @patch.dict(os.environ, {"DJANGO_API_TOKEN": "secret-token"}, clear=False)
    def test_rejects_invalid_api_token(self):
        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "recipient_phone": "+15555550123",
                    "public_id": "abc123",
                    "token": "token",
                }
            ),
            content_type="application/json",
            HTTP_X_API_KEY="wrong-token",
        )

        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"ok": False, "error": "Unauthorized"})

    @patch.dict(
        os.environ,
        {
            "QC_ENABLE_SMS_DELIVERY": "false",
            "NEXT_PUBLIC_SITE_URL": "http://127.0.0.1:3000",
        },
        clear=False,
    )
    def test_returns_simulated_success_when_sms_disabled(self):
        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "recipient_phone": "+15555550123",
                    "public_id": "abc123",
                    "token": "token",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["simulated"])
