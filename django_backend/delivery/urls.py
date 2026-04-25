from django.urls import path

from .views import send_moment

urlpatterns = [
    path("moments/send/", send_moment, name="send_moment"),
]
