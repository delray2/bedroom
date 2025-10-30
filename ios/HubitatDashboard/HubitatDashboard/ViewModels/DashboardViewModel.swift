import Foundation
import SwiftUI

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published private(set) var devices: [DeviceState] = []
    @Published private(set) var spotifyState: SpotifyPlaybackState?
    @Published private(set) var connectionStatus: ConnectionStatus = .disconnected
    @Published private(set) var spotifyIsAuthenticated = false
    @Published private(set) var errorMessage: String?

    private var hubitatService: HubitatService?
    private var webSocketClient: WebSocketClient?
    private var spotifyService: SpotifyService?

    private var configuration: AppConfiguration?
    private var didBootstrap = false

    init(preview: Bool = false) {
        if preview {
            self.devices = DeviceState.previewDevices
            self.spotifyState = .preview
            self.connectionStatus = .connected
            self.spotifyIsAuthenticated = true
        }
    }

    func bootstrapIfNeeded(configuration: AppConfiguration) async {
        guard !didBootstrap else { return }
        self.configuration = configuration

        let hubitatService = HubitatService(baseURL: configuration.backendBaseURL)
        let webSocketClient = WebSocketClient(url: configuration.webSocketURL)
        let spotifyService = SpotifyService(configuration: configuration)

        self.hubitatService = hubitatService
        self.webSocketClient = webSocketClient
        self.spotifyService = spotifyService

        webSocketClient.onMessage = { [weak self] message in
            Task { await self?.handleWebSocketMessage(message) }
        }

        webSocketClient.onStateChange = { [weak self] state in
            Task { await self?.handleWebSocketStateChange(state) }
        }

        await refreshDevices()
        webSocketClient.connect()
        await updateSpotifyState()
        didBootstrap = true
    }

    func reconnectWebSocket() {
        webSocketClient?.disconnect()
        webSocketClient?.connect()
    }

    func refreshDevices() async {
        guard let hubitatService else { return }
        do {
            devices = try await hubitatService.fetchDevices()
        } catch {
            errorMessage = "Failed to load devices: \(error.localizedDescription)"
        }
    }

    func authenticateSpotify(from configuration: AppConfiguration) async {
        guard let spotifyService else { return }
        do {
            spotifyIsAuthenticated = try await spotifyService.authorize()
            if spotifyIsAuthenticated {
                await updateSpotifyState()
            }
        } catch {
            errorMessage = "Spotify authentication failed: \(error.localizedDescription)"
        }
    }

    func logoutSpotify() async {
        await spotifyService?.logout()
        spotifyState = nil
        spotifyIsAuthenticated = false
    }

    func playPause() async {
        guard let spotifyService else { return }
        do {
            if spotifyState?.isPlaying == true {
                try await spotifyService.pause()
            } else {
                try await spotifyService.play()
            }
            await updateSpotifyState()
        } catch {
            errorMessage = "Playback failed: \(error.localizedDescription)"
        }
    }

    func skipNext() async {
        guard let spotifyService else { return }
        do {
            try await spotifyService.next()
            await updateSpotifyState()
        } catch {
            errorMessage = "Unable to skip: \(error.localizedDescription)"
        }
    }

    func skipPrevious() async {
        guard let spotifyService else { return }
        do {
            try await spotifyService.previous()
            await updateSpotifyState()
        } catch {
            errorMessage = "Unable to skip: \(error.localizedDescription)"
        }
    }

    func setVolume(to value: Double) async {
        guard let spotifyService else { return }
        do {
            try await spotifyService.setVolume(Int(value * 100))
            await updateSpotifyState()
        } catch {
            errorMessage = "Unable to set volume: \(error.localizedDescription)"
        }
    }

    private func updateSpotifyState() async {
        guard let spotifyService else { return }
        do {
            spotifyState = try await spotifyService.currentPlayback()
            spotifyIsAuthenticated = spotifyService.isAuthorized
        } catch {
            if (error as? SpotifyService.SpotifyError) == .notAuthenticated {
                spotifyIsAuthenticated = false
            } else {
                errorMessage = "Unable to load playback state: \(error.localizedDescription)"
            }
        }
    }

    private func handleWebSocketStateChange(_ state: WebSocketClient.State) async {
        connectionStatus = ConnectionStatus(state: state)
    }

    private func handleWebSocketMessage(_ message: WebSocketClient.Message) async {
        switch message {
        case .hubitat(let device):
            if let index = devices.firstIndex(where: { $0.deviceId == device.deviceId }) {
                devices[index] = device
            } else {
                devices.append(device)
            }
        case .spotify(let state):
            spotifyState = state
        case .notification(let note):
            errorMessage = note
        }
    }

    enum ConnectionStatus: String {
        case connecting
        case connected
        case disconnected

        init(state: WebSocketClient.State) {
            switch state {
            case .connecting: self = .connecting
            case .connected: self = .connected
            case .disconnected: self = .disconnected
            }
        }
    }
}
