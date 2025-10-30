import Foundation
import SwiftUI

struct AppConfiguration: Equatable {
    var backendBaseURL: URL
    var webSocketURL: URL
    var githubProxyBaseURL: URL
    var spotifyClientID: String
    var spotifyRedirectScheme: String

    static func loadDefault(bundle: Bundle = .main) -> AppConfiguration {
        guard
            let url = bundle.url(forResource: "AppConfiguration", withExtension: "plist"),
            let data = try? Data(contentsOf: url),
            let dict = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any]
        else {
            assertionFailure("Missing AppConfiguration.plist in bundle")
            return preview
        }

        return AppConfiguration(
            backendBaseURL: URL(string: dict["BackendBaseURL"] as? String ?? "https://localhost:4711")!,
            webSocketURL: URL(string: dict["WebSocketURL"] as? String ?? "wss://localhost:4712")!,
            githubProxyBaseURL: URL(string: dict["GithubProxyBaseURL"] as? String ?? "https://yourname.github.io/spotify-proxy")!,
            spotifyClientID: dict["SpotifyClientID"] as? String ?? "",
            spotifyRedirectScheme: dict["SpotifyRedirectScheme"] as? String ?? "hubitatdashboard"
        )
    }

    static var preview: AppConfiguration {
        AppConfiguration(
            backendBaseURL: URL(string: "https://localhost:4711")!,
            webSocketURL: URL(string: "wss://localhost:4712")!,
            githubProxyBaseURL: URL(string: "https://example.github.io/spotify-proxy")!,
            spotifyClientID: "preview-client-id",
            spotifyRedirectScheme: "hubitatdashboard"
        )
    }
}

private struct AppConfigurationKey: EnvironmentKey {
    static let defaultValue = AppConfiguration.preview
}

extension EnvironmentValues {
    var appConfiguration: AppConfiguration {
        get { self[AppConfigurationKey.self] }
        set { self[AppConfigurationKey.self] = newValue }
    }
}
