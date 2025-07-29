# Amazon Product Compare - Blog Post Generator

This is an AI-powered, self-hosted web application to generate comparison blog posts for Amazon products.

## Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1.  **Clone the repository or save the files:**
    Ensure all the project files (`Dockerfile`, `docker-compose.yml`, `package.json`, etc.) are in a single directory on your machine.

2.  **Build and Run with Docker Compose:**
    Open your terminal, navigate to the project directory, and run the following command:

    ```bash
    docker-compose up --build
    ```

    - The `--build` flag tells Docker Compose to build the image from the `Dockerfile` the first time you run it.
    - This command will start the application server inside a Docker container.

3.  **Access the Application:**
    Once the container is running, open your web browser and go to:
    [http://localhost:8989](http://localhost:8989)

4.  **Set your API Key:**
    Navigate to the "Dashboard" page in the application and enter your Google Gemini API key. The key will be stored securely in the app's database on your host machine.

## How it Works

-   **Backend:** A lightweight Node.js/Express server handles API requests and interacts with the Gemini API.
-   **Frontend:** A React single-page application provides the user interface.
-   **Database:** An SQLite database stores all your data (API key, settings, posts, templates).
-   **Persistence:** A Docker Volume is used to map the SQLite database file from inside the container to a `./data` directory on your host machine. This ensures your data is safe and persists even if the container is stopped or removed.

## Stopping the Application

To stop the running application, press `Ctrl + C` in the terminal where `docker-compose up` is running.

To restart it later, simply run `docker-compose up` again from the project directory.