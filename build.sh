#!/usr/bin/env bash

set -o errexit

pip install -r requirements.txt

cd src
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py create_admin_user
