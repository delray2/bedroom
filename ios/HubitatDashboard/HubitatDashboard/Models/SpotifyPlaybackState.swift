import Foundation

struct SpotifyPlaybackState: Codable, Equatable {
    struct Track: Codable, Equatable, Identifiable {
        var id: String { uri }
        let uri: String
        let name: String
        let artist: String
        let album: String
        let artworkURL: URL?
    }

    let isPlaying: Bool
    let progress: TimeInterval
    let duration: TimeInterval
    let track: Track
    let volume: Double

    static let preview = SpotifyPlaybackState(
        isPlaying: true,
        progress: 42,
        duration: 180,
        track: Track(
            uri: "spotify:track:preview",
            name: "Preview Song",
            artist: "Preview Artist",
            album: "Preview Album",
            artworkURL: URL(string: "https://via.placeholder.com/300")
        ),
        volume: 0.4
    )
}
