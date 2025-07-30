# Git Guidelines

This document describes the Git branching strategy and contribution workflow for this project, following Jira User Story-based development.

## Branching Strategy

- **main**  
    - Always contains stable, production-ready code
    - Do not commit directly to `main`

- **ISSUEID-ISSUETITLE-**  
    - Create a new branch for each Jira **User Story**
    - Branches should be created via Jira's **"Create branch"** button  
    - Jira will automatically suggest a branch name in the format: **ISSUEID-ISSUETITLE-**
    - Use the suggested branch name exactly as it appears. Do not rename or modify it

## Development Workflow

1. In Jira, go to the User Story and click **"Create branch"**  
   - Select the target GitHub repository  
   - Ensure the base branch is set to `main`  
   - Use the suggested branch name

2. In your local environment, fetch the latest remote branches

```bash
    git fetch origin
```

3.	Check out the newly created remote branch locally

```bash
   git checkout -b branch-name origin/branch-name
```

4.	Make your changes and commit regularly

```bash
   git add .
```

5.	Commit your changes using the Jira Sub-task screen

- Go to the corresponding Subtask in Jira
- Click **“Create commit”**
- Copy the suggested commit command

```bash
    git commit -m "ISSUEID <message>"
```

6.	Push your branch to GitHub

```bash
   git push origin branch-name
```

7.	Create a Pull Request (PR)

8.	After approval, merge the PR into main