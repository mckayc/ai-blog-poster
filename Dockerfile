# Stage 1: Build the React frontend
# Use a full Node.js image that includes all the tools needed to build our project.
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker's layer caching.
# This step will only be re-run if these files change.
COPY package*.json ./

# Install all dependencies, including the development ones needed for the build.
RUN npm install

# Copy the rest of the application source code into the container.
COPY . .

# Run the Vite build script to compile the React app into static HTML, CSS, and JS.
# The output will be in the /app/dist directory.
RUN npm run build


# Stage 2: Create the final production image
# Start from a lightweight and more secure Node.js alpine image.
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json again
COPY package*.json ./

# Install ONLY the production dependencies. We don't need the build tools here.
# This makes the final image smaller and more secure.
RUN npm install --omit=dev

# Copy the built frontend assets from the 'builder' stage into our final image.
COPY --from=builder /app/dist ./dist

# Copy the server-side code (Node.js backend) into the final image.
COPY server ./server

# Expose the port the server runs on inside the container.
EXPOSE 3000

# The command to run when the container starts. This starts our Node.js server.
CMD ["npm", "start"]