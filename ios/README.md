# HubitatDashboard iOS Conversion

This directory contains a native SwiftUI implementation of the Hubitat dashboard along with configuration required to bridge Spotify authentication through GitHub Pages.

## Structure

```
ios/
  HubitatDashboard/
    HubitatDashboardApp.swift       # App entry point
    Core/                           # Runtime configuration helpers
    Models/                         # Codable view models for Hubitat + Spotify
    Services/                       # Networking, WebSocket, and Spotify bridge clients
    Views/                          # SwiftUI interface for devices and Spotify player
    Support/AppConfiguration.example.plist
    Resources/                      # Assets placeholder for Xcode
    HubitatDashboard.xcodeproj/     # Xcode project for the iOS app
  README.md
```

## Configuration

1. Duplicate `Support/AppConfiguration.example.plist` and rename it to `AppConfiguration.plist`.
2. Update the keys to match your environment:
   - `BackendBaseURL`: HTTPS URL of the Node.js backend defined in `main.js`.
   - `WebSocketURL`: WebSocket endpoint for `wss://<host>:4712`.
   - `GithubProxyBaseURL`: The GitHub Pages URL that serves the Spotify proxy bridge (see below).
   - `SpotifyClientID`: Client ID from your Spotify developer application configured for the implicit grant flow.
   - `SpotifyRedirectScheme`: Custom URL scheme registered in Xcode (default `hubitatdashboard`).

## GitHub Pages Spotify Bridge

The iOS app expects an HTTPS hosted bridge that lives at `GithubProxyBaseURL`. The HTML and JavaScript assets for that proxy are located in `docs/spotify-proxy`. Deploy that directory to GitHub Pages (for example via the `docs/` folder convention).

The bridge performs two tasks:

1. **OAuth Redirect Handling** – orchestrates the implicit grant flow and returns the access token to the iOS app via a custom URL scheme.
2. **API Forwarding** – exposes a messaging bridge that accepts encoded requests from the app and executes Spotify Web API calls inside the GitHub Pages context.

## Building the App

1. Open `ios/HubitatDashboard/HubitatDashboard.xcodeproj` in Xcode 15 or newer.
2. Ensure your development team is selected under Signing & Capabilities.
3. Add the custom URL scheme (`hubitatdashboard`) to the project if you change it in the configuration plist.
4. Build and run on a simulator or device.

## Runtime Notes

- The app uses the existing WebSocket stream from the Electron backend for real-time Hubitat updates.
- Spotify playback controls are routed through the GitHub Pages proxy. Because the implicit grant flow does not support refresh tokens, the user may need to re-authenticate once the access token expires.
- Sensitive secrets should never be committed. Keep `AppConfiguration.plist` out of version control or manage via Xcode configurations.
