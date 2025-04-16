# Contributing to django-admin-collaborator

First of all, thank you for considering contributing to django-admin-collaborator! Your contributions will help improve the project and make it better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Environment Setup](#environment-setup)
  - [Development Environment](#development-environment)
- [Contribution Process](#contribution-process)
  - [Issues](#issues)
  - [Pull Requests](#pull-requests)
- [Coding Standards](#coding-standards)
  - [Python Style Guide](#python-style-guide)
  - [Django Best Practices](#django-best-practices)
- [Documentation](#documentation)
- [Versioning](#versioning)
- [Community](#community)

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please be respectful and considerate when interacting with other contributors and users.

## Getting Started

### Environment Setup

1. **Fork the repository**:
   - Go to [https://github.com/Brktrlw/django-admin-collaborator](https://github.com/Brktrlw/django-admin-collaborator)
   - Click on the "Fork" button in the top-right corner

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/django-admin-collaborator.git
   cd django-admin-collaborator
   ```

3. **Set up upstream remote**:
   ```bash
   git remote add upstream https://github.com/Brktrlw/django-admin-collaborator.git
   ```

### Development Environment

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install development dependencies**:
   ```bash
   pip install -e ".[dev]"
   # or
   pip install -e .
   pip install -r requirements-dev.txt
   ```

## Contribution Process

### Issues

- Before creating a new issue, please check if a similar issue already exists.
- Use the provided issue templates when reporting bugs or requesting features.
- Provide as much detail as possible, including steps to reproduce bugs, expected vs. actual behavior, and your environment details.

### Pull Requests

1. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```

2. **Make your changes** and commit them with clear, descriptive commit messages:
   ```bash
   git commit -m "Add feature: your feature description"
   ```

3. **Keep your branch updated** with the main repository:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**:
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your branch and fill out the PR template
   - Reference any related issues by including "Fixes #123" or "Closes #123" in the PR description

6. **Code Review**:
   - Maintainers will review your code
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

## Coding Standards

### Python Style Guide

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) guidelines
- Use docstrings for all functions, methods, and classes
- Keep lines to a maximum of 88 characters (Black default)
- Use meaningful variable and function names

### Django Best Practices

- Follow the [Django coding style](https://docs.djangoproject.com/en/dev/internals/contributing/writing-code/coding-style/)
- Use Django's ORM effectively
- Keep views simple and focused
- Write reusable components when possible

## Documentation

- Update documentation for any changes to public API
- Add docstrings to all functions, methods, and classes
- Keep the README updated with any significant changes
- Consider adding examples for complex features

## Versioning

We follow [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for new functionality in a backward-compatible manner
- PATCH version for backward-compatible bug fixes

## Community

- Join discussions in GitHub Issues and Pull Requests
- Be respectful and considerate of others
- Help others who have questions about the project

---

Thank you for contributing to django-admin-collaborator! Your efforts help make this project better for everyone.
