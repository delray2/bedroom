#!/bin/bash

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the main dashboard (includes Spotify authentication)
echo "Starting Hubitat Dashboard with integrated Spotify support..."
npm start 