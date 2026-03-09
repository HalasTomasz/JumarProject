import os

import django


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jumar.settings')
    django.setup()

    from django.contrib.auth.models import User, Group

    user, _ = User.objects.get_or_create(
        username='admin', defaults={'email': 'admin@example.com'}
    )
    user.set_password('Tajne123!')
    user.is_staff = user.is_superuser = True
    user.save()
    group, _ = Group.objects.get_or_create(name='admin')
    user.groups.add(group)
    print('Admin ready: admin / Tajne123!')


if __name__ == '__main__':
    main()
