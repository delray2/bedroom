import Foundation
import WebKit

@MainActor
final class SpotifyProxyClient: NSObject {
    struct Request: Codable {
        let id: String
        let method: String
        let path: String
        let body: String?
        let accessToken: String
    }

    struct Response: Decodable {
        let id: String
        let status: Int
        let body: String?
        let error: String?
    }

    enum ProxyError: Error {
        case bridgeUnavailable
        case invalidResponse
        case requestFailed(status: Int, body: String?)
    }

    private let configuration: AppConfiguration
    private let webView: WKWebView
    private var isBridgeReady = false
    private var bridgeContinuation: CheckedContinuation<Void, Error>?
    private var pendingRequests: [String: CheckedContinuation<Data, Error>] = [:]

    init(configuration: AppConfiguration) {
        self.configuration = configuration

        let contentController = WKUserContentController()
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        self.webView = WKWebView(frame: .zero, configuration: config)

        super.init()

        contentController.add(self, name: "spotifyProxy")
        webView.navigationDelegate = self
    }

    deinit {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "spotifyProxy")
    }

    static func authorizeURL(baseURL: URL, clientID: String, redirectScheme: String, state: String, scope: String) -> URL? {
        var components = URLComponents(url: baseURL.appending(path: "index.html"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "action", value: "authorize"),
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_scheme", value: redirectScheme),
            URLQueryItem(name: "scope", value: scope),
            URLQueryItem(name: "state", value: state)
        ]
        return components?.url
    }

    func ensureBridgeLoaded() async throws {
        if isBridgeReady { return }

        try await withCheckedThrowingContinuation { continuation in
            bridgeContinuation = continuation
            var components = URLComponents(url: configuration.githubProxyBaseURL.appending(path: "index.html"), resolvingAgainstBaseURL: false)
            components?.queryItems = [URLQueryItem(name: "action", value: "bridge")]
            guard let url = components?.url else {
                continuation.resume(throwing: ProxyError.bridgeUnavailable)
                return
            }
            webView.load(URLRequest(url: url))
        }
    }

    func perform(method: String, path: String, body: Data? = nil, accessToken: String) async throws -> Data {
        try await ensureBridgeLoaded()

        return try await withCheckedThrowingContinuation { continuation in
            let id = UUID().uuidString
            pendingRequests[id] = continuation

            let bodyString = body.flatMap { $0.base64EncodedString() }
            let request = Request(id: id, method: method, path: path, body: bodyString, accessToken: accessToken)

            guard let payload = try? JSONEncoder().encode(request) else {
                continuation.resume(throwing: ProxyError.invalidResponse)
                return
            }

            let base64 = payload.base64EncodedString()
            let script = "window.spotifyBridge.performEncodedRequest('" + base64 + "')"
            webView.evaluateJavaScript(script) { _, error in
                if let error {
                    let continuation = self.pendingRequests.removeValue(forKey: id)
                    continuation?.resume(throwing: error)
                }
            }
        }
    }
}

extension SpotifyProxyClient: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isBridgeReady = true
        bridgeContinuation?.resume()
        bridgeContinuation = nil
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        bridgeContinuation?.resume(throwing: error)
        bridgeContinuation = nil
    }
}

extension SpotifyProxyClient: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "spotifyProxy" else { return }
        guard let dataString = message.body as? String, let data = Data(base64Encoded: dataString) else {
            return
        }

        guard let response = try? JSONDecoder().decode(Response.self, from: data) else {
            return
        }

        guard let continuation = pendingRequests.removeValue(forKey: response.id) else { return }

        if let error = response.error {
            continuation.resume(throwing: ProxyError.requestFailed(status: response.status, body: error))
            return
        }

        if !(200..<300).contains(response.status) {
            continuation.resume(throwing: ProxyError.requestFailed(status: response.status, body: response.body))
            return
        }

        if let body = response.body, let decoded = Data(base64Encoded: body) {
            continuation.resume(returning: decoded)
        } else {
            continuation.resume(returning: Data())
        }
    }
}
