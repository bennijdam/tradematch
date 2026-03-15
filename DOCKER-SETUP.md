# TradeMatch Docker Deployment Guide

This document outlines the Docker deployment configuration for TradeMatch. This configuration is designed for both local development using production-like environments and straightforward production deployment.

## Architecture

The Docker deployment consists of two main services orchestrated by `docker-compose`:

1.  **Backend API (`tradematch-api`)**
    *   **Dockerfile:** `docker/api.Dockerfile`
    *   **Port:** 3000
    *   **Environment:** Node.js 20 Alpine
    *   **Description:** Runs the `apps/api` Node.js server. Dependencies are isolated and installed during the build process.

2.  **Frontend Web (`tradematch-web`)**
    *   **Dockerfile:** `docker/web.Dockerfile`
    *   **Port:** 8080
    *   **Environment:** Alpine with `serve` (npm package)
    *   **Description:** Serves the static HTML/JS/CSS files built statically (or directly from the root structure).

## Prerequisites

*   Docker
*   Docker Compose

## Configuration

Both containers automatically load environment variables from the root directory:
*   `.env`
*   `.env.local`

**Note:** Ensure these files contain the necessary secrets (like Database URLs, API keys) before starting the containers.

## How to Start

We have provided helper scripts to make launching the environment a one-command process.

### On Linux / macOS / WSL:
```bash
cd docker
chmod +x start-docker.sh
./start-docker.sh
```

### On Windows (Command Prompt / PowerShell):
```cmd
cd docker
start-docker.bat
```

These scripts will automatically:
1. Stop any currently running instances.
2. Rebuild the latest changes (`--build`).
3. Start the containers in detached mode (`-d`).

## Manual Docker Compose Commands

If you prefer to run the commands manually from the `docker` directory:

*   **Start & Build:** `docker-compose up -d --build`
*   **Stop:** `docker-compose down`
*   **View Logs:** `docker-compose logs -f`
*   **View specific service logs:** `docker-compose logs -f api` or `docker-compose logs -f web`

## Important Notes for Future Agents

*   **Caching & `.dockerignore`:** A `.dockerignore` file is present in the root directory to prevent huge directories like `node_modules`, `.git`, and `__pycache__` from being transferred to the Docker daemon, significantly speeding up build times.
*   **Hot Reloading:** This current setup is optimized for *running* the application (production-like). It copies the files during the build phase. If you need hot-reloading for active development where changes immediately reflect in the container without a rebuild, you would need to modify the `docker-compose.yml` to set up volume bindings (e.g., `- ../apps/api:/app/apps/api`).
*   **Dependencies:** The API container specifically installs `apps/api/package.json` dependencies. Make sure `package.json` reflects the absolute necessary dependencies for production.
