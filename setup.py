#!/usr/bin/env python
import os
from setuptools import setup, find_packages

# Read the contents of the README file
with open(os.path.join(os.path.dirname(__file__), 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

# Read version from __init__.py
with open('django_admin_collaborator/__init__.py', encoding='utf-8') as f:
    for line in f:
        if line.startswith('__version__'):
            version = line.split('=')[1].strip().strip("'").strip('"')
            break
    else:
        version = '0.2.6'

project_urls = {
  'Read The Docs': 'https://django-admin-collaborator.readthedocs.io/en/latest/',
}

setup(
    name="django-admin-collaborator",
    version=version,
    description="Real-time collaborative editing for Django admin with WebSockets",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Berkay Şen",
    author_email="berkaysen@proton.me",
    url="https://github.com/Brktrlw/django-admin-collaborator",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    classifiers=[
        "Development Status :: 4 - Beta",
        "Environment :: Web Environment",
        "Framework :: Django",
        "Framework :: Django :: 3.2",
        "Framework :: Django :: 4.0",
        "Framework :: Django :: 4.1",
        "Framework :: Django :: 4.2",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
    install_requires=[
        "Django>=3.2",
        "channels>=3.0.0",
        "channels-redis>=4.0.0",
        "redis>=4.0.0",
    ],
    keywords="django, admin, realtime, collaboration, websockets, channels",
    project_urls=project_urls,
)