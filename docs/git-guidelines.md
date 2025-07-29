# Git Guidelines

This document describes the Git branching strategy and contribution workflow for this project.

## Branching Strategy

- **main**  
    - Always contains stable, production-ready code.  
    - Do not commit directly to `main`.

- **feature/branch-name**  
    - Use this for developing new features or making changes.  
    - Each feature should have its own branch (e.g., `feature/login-page`).

## Development Workflow

1. Pull the latest changes from `main`

```bash
    git checkout main
    git pull origin main
```

2.	Create a new feature branch

```bash
    git checkout -b feature/your-feature-name
```

3.	Make your changes and commit regularly

```bash
    git add .
    git commit -m "feat: Add login form validation"
```

4.	Push your branch to GitHub

```bash
    git push origin feature/your-feature-name
```

5.	Create a Pull Request (PR)

    - Use a clear and concise title
    - Describe the purpose of the change
    - Link related issues if any
    - Request a review from a teammate

6.	After approval, merge the PR into main

## Commit Message Convention

- **Format:**

<type>: <short description>

- **Types:**

    - `feat`: A new feature  
    - `fix`: A bug fix  
    - `refactor`: Code restructuring without behavior change  
    - `docs`: Documentation-only changes  
    - `style`: Code formatting (e.g., spaces, indentation)  
    - `test`: Adding or modifying tests