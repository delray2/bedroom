import AuthenticationServices
import Foundation
import SwiftUI
import UIKit

@MainActor
final class SpotifyAuthManager: NSObject {
    struct Token: Codable {
        let accessToken: String
        let expiresAt: Date

        var isValid: Bool {
            Date() < expiresAt.addingTimeInterval(-60)
        }
    }

    enum AuthError: Error {
        case invalidCallback
        case cancelled
        case presentationAnchor
    }

    private let configuration: AppConfiguration
    private var token: Token? {
        didSet { persistToken() }
    }

    private let storageKey = "spotify-auth-token"

    init(configuration: AppConfiguration) {
        self.configuration = configuration
        super.init()
        loadToken()
    }

    var currentToken: Token? {
        guard let token, token.isValid else { return nil }
        return token
    }

    var isAuthorized: Bool {
        currentToken != nil
    }

    func authorize() async throws -> Token {
        if let token = currentToken {
            return token
        }

        let state = UUID().uuidString
        let scope = "user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state"

        guard let authorizeURL = SpotifyProxyClient.authorizeURL(
            baseURL: configuration.githubProxyBaseURL,
            clientID: configuration.spotifyClientID,
            redirectScheme: configuration.spotifyRedirectScheme,
            state: state,
            scope: scope
        ) else {
            throw AuthError.invalidCallback
        }

        let callbackScheme = configuration.spotifyRedirectScheme

        return try await withCheckedThrowingContinuation { [weak self] continuation in
            guard let self else { return continuation.resume(throwing: AuthError.presentationAnchor) }

            let session = ASWebAuthenticationSession(url: authorizeURL, callbackURLScheme: callbackScheme) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    continuation.resume(throwing: AuthError.cancelled)
                    return
                }

                guard let callbackURL else {
                    continuation.resume(throwing: AuthError.invalidCallback)
                    return
                }

                guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                      let fragment = components.fragment else {
                    continuation.resume(throwing: AuthError.invalidCallback)
                    return
                }

                let params = Self.parse(fragment: fragment)

                guard params["state"] == state,
                      let accessToken = params["access_token"],
                      let expiresInString = params["expires_in"],
                      let expiresIn = TimeInterval(expiresInString) else {
                    continuation.resume(throwing: AuthError.invalidCallback)
                    return
                }

                let token = Token(accessToken: accessToken, expiresAt: Date().addingTimeInterval(expiresIn))
                self.token = token
                continuation.resume(returning: token)
            }

            session.prefersEphemeralWebBrowserSession = true
            session.presentationContextProvider = self
            if !session.start() {
                continuation.resume(throwing: AuthError.presentationAnchor)
            }
        }
    }

    func logout() {
        token = nil
    }

    private func persistToken() {
        guard let token else {
            UserDefaults.standard.removeObject(forKey: storageKey)
            return
        }
        if let data = try? JSONEncoder().encode(token) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func loadToken() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let token = try? JSONDecoder().decode(Token.self, from: data) else { return }
        self.token = token
    }

    private static func parse(fragment: String) -> [String: String] {
        fragment
            .split(separator: "&")
            .reduce(into: [String: String]()) { result, pair in
                let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
                guard parts.count == 2 else { return }
                result[parts[0]] = parts[1].removingPercentEncoding ?? parts[1]
            }
    }
}

extension SpotifyAuthManager: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return UIWindow()
        }
        return window
    }
}
