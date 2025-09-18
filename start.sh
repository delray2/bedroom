#!/bin/bash

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the dashboard
if [ "$1" = "server" ]; then
    echo "Starting Hubitat Dashboard backend (headless)..."
    npm run server
else
    echo "Starting Hubitat Dashboard kiosk..."
    npm start
fi