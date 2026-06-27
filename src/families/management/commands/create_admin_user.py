import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Garante o superusuário de demonstração ou o configurado por ambiente"

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@pilar.local")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin123")

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email},
        )

        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save(update_fields=["email", "is_staff", "is_superuser", "password"])

        action = "criado" if created else "atualizado"
        self.stdout.write(
            self.style.SUCCESS(f"Superusuário de demonstração {action} com sucesso.")
        )
