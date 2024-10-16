#!/bin/zsh

# Define the project directory
PROJECT_DIR=$(pwd)

# Find all top-level files in the project directory
TOP_LEVEL_FILES=$(find "$PROJECT_DIR" -maxdepth 1 -type f)

# Open each top-level file with Visual Studio Code
for file in $TOP_LEVEL_FILES; do
  code "$file"
done

# Open Visual Studio Code with the project directory to ensure Copilot reads the context
code "$PROJECT_DIR"
