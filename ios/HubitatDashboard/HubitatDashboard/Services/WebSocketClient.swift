import Foundation

final class WebSocketClient: NSObject {
    enum State {
        case connecting
        case connected
        case disconnected
    }

    enum Message {
        case hubitat(DeviceState)
        case spotify(SpotifyPlaybackState)
        case notification(String)
    }

    private let url: URL
    private var task: URLSessionWebSocketTask?
    private lazy var session: URLSession = {
        let configuration = URLSessionConfiguration.default
        return URLSession(configuration: configuration, delegate: self, delegateQueue: .main)
    }()

    var onMessage: ((Message) -> Void)?
    var onStateChange: ((State) -> Void)?

    init(url: URL) {
        self.url = url
        super.init()
    }

    func connect() {
        disconnect()
        onStateChange?(.connecting)
        task = session.webSocketTask(with: url)
        task?.resume()
        receive()
    }

    func disconnect() {
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
        onStateChange?(.disconnected)
    }

    private func receive() {
        task?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let message):
                self.handle(message)
                self.receive()
            case .failure:
                self.disconnect()
            }
        }
    }

    private func handle(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let string):
            guard let data = string.data(using: .utf8) else { return }
            parse(data: data)
        case .data(let data):
            parse(data: data)
        @unknown default:
            break
        }
    }

    private func parse(data: Data) {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let type = json["type"] as? String
        else { return }

        switch type {
        case "hubitat_state":
            if let device = try? JSONDecoder().decode(DeviceState.self, from: data) {
                onMessage?(.hubitat(device))
            }
        case "spotify_state":
            if let payload = json["payload"],
               let payloadData = try? JSONSerialization.data(withJSONObject: payload, options: []),
               let state = try? JSONDecoder().decode(SpotifyPlaybackState.self, from: payloadData) {
                onMessage?(.spotify(state))
            }
        case "notification":
            if let message = json["note"] as? String {
                onMessage?(.notification(message))
            }
        default:
            break
        }
    }
}

extension WebSocketClient: URLSessionWebSocketDelegate {
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        onStateChange?(.connected)
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        onStateChange?(.disconnected)
    }
}
