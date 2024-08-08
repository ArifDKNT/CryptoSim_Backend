# Use an official Node runtime as a parent image
FROM node:14

# Set the working directory
WORKDIR ./

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["node", "/server.js"]
