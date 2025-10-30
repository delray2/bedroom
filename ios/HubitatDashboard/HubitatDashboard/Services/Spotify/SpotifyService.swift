import Foundation

@MainActor
final class SpotifyService {
    enum SpotifyError: Error {
        case notAuthenticated
        case invalidResponse
    }

    private let authManager: SpotifyAuthManager
    private let proxyClient: SpotifyProxyClient
    private let decoder = JSONDecoder()

    var isAuthorized: Bool {
        authManager.isAuthorized
    }

    init(configuration: AppConfiguration) {
        self.authManager = SpotifyAuthManager(configuration: configuration)
        self.proxyClient = SpotifyProxyClient(configuration: configuration)
    }

    @discardableResult
    func authorize() async throws -> Bool {
        _ = try await authManager.authorize()
        return true
    }

    func logout() async {
        authManager.logout()
    }

    func currentPlayback() async throws -> SpotifyPlaybackState {
        let data = try await request(method: "GET", path: "/v1/me/player")
        return try parsePlaybackState(from: data)
    }

    func play() async throws {
        _ = try await request(method: "PUT", path: "/v1/me/player/play")
    }

    func pause() async throws {
        _ = try await request(method: "PUT", path: "/v1/me/player/pause")
    }

    func next() async throws {
        _ = try await request(method: "POST", path: "/v1/me/player/next")
    }

    func previous() async throws {
        _ = try await request(method: "POST", path: "/v1/me/player/previous")
    }

    func setVolume(_ percent: Int) async throws {
        let path = "/v1/me/player/volume?volume_percent=\(percent)"
        _ = try await request(method: "PUT", path: path)
    }

    private func request(method: String, path: String, body: Data? = nil) async throws -> Data {
        guard let token = authManager.currentToken else {
            throw SpotifyError.notAuthenticated
        }
        return try await proxyClient.perform(method: method, path: path, body: body, accessToken: token.accessToken)
    }

    private func parsePlaybackState(from data: Data) throws -> SpotifyPlaybackState {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw SpotifyError.invalidResponse
        }

        guard let item = json["item"] as? [String: Any],
              let name = item["name"] as? String,
              let artists = item["artists"] as? [[String: Any]],
              let album = item["album"] as? [String: Any],
              let albumName = album["name"] as? String,
              let uri = item["uri"] as? String else {
            throw SpotifyError.invalidResponse
        }

        let artworkURL: URL?
        if let images = album["images"] as? [[String: Any]], let first = images.first, let url = first["url"] as? String {
            artworkURL = URL(string: url)
        } else {
            artworkURL = nil
        }

        let artistNames = artists.compactMap { $0["name"] as? String }.joined(separator: ", ")
        let isPlaying = json["is_playing"] as? Bool ?? false
        let progress = (json["progress_ms"] as? TimeInterval ?? 0) / 1000
        let duration = (item["duration_ms"] as? TimeInterval ?? 0) / 1000
        let device = json["device"] as? [String: Any]
        let volumePercent = (device?["volume_percent"] as? Double ?? 50) / 100

        return SpotifyPlaybackState(
            isPlaying: isPlaying,
            progress: progress,
            duration: duration,
            track: SpotifyPlaybackState.Track(
                uri: uri,
                name: name,
                artist: artistNames,
                album: albumName,
                artworkURL: artworkURL
            ),
            volume: volumePercent
        )
    }
}
