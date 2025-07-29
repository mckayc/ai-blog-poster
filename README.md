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

3.  **Build and Run with Docker Compose:**
    Open your terminal, navigate to the project directory, and run the following command:

    ```bash
    docker-compose up --build
    ```

    - The `--build` flag tells Docker Compose to build the image from the `Dockerfile` the first time you run it.
    - This command will start the application server inside a Docker container.

4.  **Access the Application:**
    Once the container is running, open your web browser and go to:
    [http://localhost:8989](http://localhost:8989)

5.  **Test your API Key:**
    Navigate to the "Dashboard" page in the application and click the "Test Connection" button to ensure your API key is working correctly.

## How it Works

-   **Backend:** A lightweight Node.js/Express server handles API requests and interacts with the Gemini API. It follows a professional controller/service architecture.
-   **Frontend:** A React single-page application provides the user interface.
-   **Database:** An SQLite database stores all your data (settings, posts, templates).
-   **Configuration:** Server configuration and API keys are managed via an `.env` file for security and flexibility.
-   **Persistence:** A Docker Volume is used to map the SQLite database file from inside the container to a `./data` directory on your host machine. This ensures your data is safe and persists even if the container is stopped or removed.

## Stopping the Application

To stop the running application, press `Ctrl + C` in the terminal where `docker-compose up` is running.

To restart it later, simply run `docker-compose up` again from the project directory.