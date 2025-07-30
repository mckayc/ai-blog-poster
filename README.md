# Post Generator

This is an AI-powered, self-hosted web application to generate comparison blog posts for Amazon products.

## Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1.  **Clone the repository or save the files:**
    Ensure all the project files (`Dockerfile`, `docker-compose.yml`, `package.json`, etc.) are in a single directory on your machine.

2.  **Create your environment file:**
    Create a file named `.env` in your project directory. Open the new `.env` file and add your Google Gemini API key:
    ```
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```

3.  **Create your Docker Compose file:**
    Create a file named `docker-compose.yml`. You have two main options for storing data, outlined below. Choose one.

---

### Option 1: Use a Named Volume (Recommended)

This is the simplest and most reliable method. Docker manages the data location, which protects against host permission issues.

**`docker-compose.yml`:**
```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: blog-post-generator-app
    ports:
      - "8989:3000" # Host port:Container port
    volumes:
      - postgamedata:/usr/src/app/data
    env_file:
      - .env
    restart: unless-stopped

volumes:
  postgamedata:
```

---

### Option 2: Use a Bind Mount (Specific Host Folder)

Use this method if you need to store the data in a specific folder on your host machine (e.g., a mounted network drive).

**`docker-compose.yml`:**
```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: blog-post-generator-app
    ports:
      - "8989:3000" # Host port:Container port
    # Find your user ID with `id -u` and group ID with `id -g` on your host machine.
    # This ensures the container has permission to write to your folder.
    user: "1000:1000" # Replace with your actual UID:GID
    volumes:
      # Replace the path on the left with the absolute path to YOUR data folder.
      - /path/on/your/server/data:/usr/src/app/data
    env_file:
      - .env
    restart: unless-stopped
```

**CRITICAL: If you use Option 2, you must set permissions on your host folder *before* starting the container:**

```bash
# Replace with the path you used in your docker-compose file
YOUR_DATA_FOLDER="/path/on/your/server/data"
YOUR_USER_ID="1000" # Replace with your user ID from `id -u`

# 1. Create the directory
sudo mkdir -p $YOUR_DATA_FOLDER

# 2. Set you as the owner
sudo chown -R $YOUR_USER_ID:$YOUR_USER_ID $YOUR_DATA_FOLDER

# 3. Set correct permissions
sudo chmod -R 775 $YOUR_DATA_FOLDER
```

---


4.  **Build and Run with Docker Compose:**
    Open your terminal, navigate to the project directory, and run the following command:

    ```bash
    docker-compose up --build -d
    ```

    - The `--build` flag tells Docker Compose to build the image the first time you run it.
    - The `-d` flag runs the container in detached mode (in the background).

5.  **Access the Application:**
    Once the container is running, open your web browser and go to `http://YOUR_SERVER_IP:8989` (or `http://localhost:8989` if running locally).

6.  **Test your API Key:**
    Navigate to the "Dashboard" page and click "Test Connection" to ensure your API key is working.

## How it Works

-   **Backend:** A lightweight Node.js/Express server handles API requests and interacts with the Gemini API.
-   **Frontend:** A React single-page application provides the user interface.
-   **Database:** An SQLite database (`database.db`) stores all your data.
-   **Data Persistence:** Your chosen Docker volume method ensures the SQLite database is kept safe and separate from the container's lifecycle, preventing data loss when you stop, remove, or update the container.

## Stopping the Application

To stop the running application, run `docker-compose down` in the project directory. Your data will be safe in the Docker volume or host folder.

To restart it later, simply run `docker-compose up -d` again.

## Troubleshooting

### I've updated the files, but I don't see my changes!

This is a common issue and is almost always caused by either Docker or your browser caching old versions of the application. Here is a surefire set of commands to force a complete refresh:

1.  **Stop and Remove Everything:**
    This command will stop your containers, remove them, and also remove the named data volume. **This will delete your database, so please back it up if needed!**

    ```bash
    docker-compose down -v
    ```

2.  **Force a Rebuild Without Cache:**
    This command tells Docker Compose to rebuild the `app` image from scratch, ignoring any cached layers. This ensures it picks up all your latest code changes.

    ```bash
    docker-compose build --no-cache
    ```

3.  **Start Fresh:**
    Now, start the newly built container.

    ```bash
    docker-compose up -d
    ```

4.  **Clear Browser Cache:**
    After the container is running, open your browser and perform a "hard refresh" to clear its cache.
    - **Windows/Linux:** `Ctrl + Shift + R`
    - **Mac:** `Cmd + Shift + R`
    - Alternatively, open the application in an incognito/private browser window.

Following these steps will ensure you are running the absolute latest version of the code with no old data or cached files interfering.
