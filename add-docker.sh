#!/bin/bash

# This script helps to add the necessary Docker and deployment files
# to your Git repository and push them to the correct branch.

# --- Configuration ---
BRANCH_NAME="Leverage-TCB"
COMMIT_MESSAGE="feat: Add Dockerfile and supporting files for TCB deployment"

# --- Script Logic ---
echo "Starting the process to add deployment files..."

# 1. Check if we are in a Git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Error: This is not a Git repository. Please run 'git init' first."
    exit 1
fi

# 2. Add all new and modified files to the staging area
echo "Adding files to Git..."
git add Dockerfile .dockerignore check-repo.js add-docker.sh

# 3. Commit the changes
echo "Committing files with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# Check if commit was successful
if [ $? -ne 0 ]; then
    echo "Commit failed. There might be no changes to commit, or another Git error occurred."
    exit 1
fi

# 4. Push the changes to the specified branch on the remote repository 'origin'
echo "Pushing changes to remote branch '$BRANCH_NAME'..."
git push origin "$BRANCH_NAME"

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed files to the '$BRANCH_NAME' branch."
else
    echo "❌ Push failed. Please check your remote repository settings and branch name."
    exit 1
fi
