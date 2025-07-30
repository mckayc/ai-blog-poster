# Post Generator

This is an AI-powered, self-hosted web application to generate comparison blog posts for Amazon products.

## Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1.  **Clone the repository or save the files:**
    Ensure all the project files (`Dockerfile`, `docker-compose.yml`, `package.json`, etc.) are in a single directory on your machine.

2.  **Create your environment file:**
    Rename the `env.sample` file to `.env`. Open the new `.env` file and add your Google Gemini API key:
    ```
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```

3.  **Create your Docker Compose file:**
    Create a file named `docker-compose.yml` and paste the following content into it. This version includes a **named volume** to ensure your data persists.

    ```yaml
    version: '3.8'

    services:
      app:
        build: .
        ports:
          - "8989:3000"
        volumes:
          - postgamedata:/usr/src/app/data
        env_file:
          - .env
        restart: unless-stopped

    volumes:
      postgamedata:
    ```

4.  **Build and Run with Docker Compose:**
    Open your terminal, navigate to the project directory, and run the following command:

    ```bash
    docker-compose up --build -d
    ```

    - The `--build` flag tells Docker Compose to build the image the first time.
    - The `-d` flag runs the container in detached mode (in the background).

5.  **Access the Application:**
    Once the container is running, open your web browser and go to:
    [http://localhost:8989](http://localhost:8989)

6.  **Test your API Key:**
    Navigate to the "Dashboard" page and click "Test Connection" to ensure your API key is working.

## How it Works

-   **Backend:** A lightweight Node.js/Express server handles API requests and interacts with the Gemini API.
-   **Frontend:** A React single-page application provides the user interface.
-   **Database:** An SQLite database stores all your data.
-   **Data Persistence:** A Docker **named volume** (`postgamedata`) is used to store the SQLite database. This is crucial as it keeps your data safe and separate from the container's lifecycle, preventing data loss when you stop or rebuild the container.

## Stopping the Application

To stop the running application, run `docker-compose down` in the project directory. Your data will be safe in the Docker volume.

To restart it later, simply run `docker-compose up -d` again.