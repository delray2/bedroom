import Foundation

final class WebSocketClient: NSObject {
    enum State {
        case connecting
        case connected
        case disconnected
    }

    enum Message {
        case hubitat(DeviceState)
        case hubitatAttributes(deviceId: String, label: String?, attributes: [String: DeviceState.AttributeValue])
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
        case "device_state_update":
            guard let deviceId = json["deviceId"] as? String else { return }
            let label = json["label"] as? String
            let attributes = (json["attributes"] as? [String: Any]).map(parseAttributes) ?? [:]
            if !attributes.isEmpty || label != nil {
                onMessage?(.hubitatAttributes(deviceId: deviceId, label: label, attributes: attributes))
            }
        case "spotify_state":
            if let payload = json["payload"],
               let payloadData = try? JSONSerialization.data(withJSONObject: payload, options: []),
               let state = try? JSONDecoder().decode(SpotifyPlaybackState.self, from: payloadData) {
                onMessage?(.spotify(state))
            }
        case "spotify_state_change":
            if let payload = json["data"] as? [String: Any], let state = parseSpotifyStateChange(payload) {
                onMessage?(.spotify(state))
            }
        case "device_notification", "general_notification", "lrgroup_update", "reolink_webhook":
            if let payload = json["payload"] {
                if let message = extractNotificationMessage(from: payload) {
                    onMessage?(.notification(message))
                }
            }
        case "notification":
            if let message = json["note"] as? String {
                onMessage?(.notification(message))
            }
        case "device_refresh_request":
            if let deviceId = json["deviceId"] as? String {
                onMessage?(.notification("Refresh requested for device #\(deviceId)"))
            }
        case "bulk_device_refresh_request":
            if let deviceIds = json["deviceIds"] as? [String] {
                onMessage?(.notification("Refresh requested for \(deviceIds.count) devices"))
            }
        default:
            break
        }
    }

    private func parseAttributes(_ attributes: [String: Any]) -> [String: DeviceState.AttributeValue] {
        attributes.reduce(into: [:]) { result, entry in
            guard let valueString = stringify(value: entry.value) else { return }
            result[entry.key] = DeviceState.AttributeValue(name: entry.key, value: valueString)
        }
    }

    private func parseSpotifyStateChange(_ data: [String: Any]) -> SpotifyPlaybackState? {
        guard let trackInfo = data["trackInfo"] as? [String: Any],
              let name = trackInfo["name"] as? String,
              let artist = trackInfo["artist"] as? String,
              let album = trackInfo["album"] as? String else {
            return nil
        }

        let isPlaying = data["isPlaying"] as? Bool ?? false
        let durationSeconds = ((trackInfo["duration"] as? TimeInterval) ?? 0) / 1000
        let progressSeconds = ((trackInfo["position"] as? TimeInterval) ?? 0) / 1000
        let imageURLString = trackInfo["imageUrl"] as? String
        let artworkURL = imageURLString.flatMap(URL.init(string:))
        let trackID = trackInfo["id"] as? String
        let explicitURI = trackInfo["uri"] as? String
        let uri = explicitURI ?? (trackID.map { "spotify:track:\($0)" } ?? name)

        let deviceInfo = data["device"] as? [String: Any]
        let volumePercent = (deviceInfo?["volume"] as? Double) ?? (deviceInfo?["volume"] as? NSNumber)?.doubleValue ?? 0
        let normalizedVolume = max(0, min(1, volumePercent / 100))

        return SpotifyPlaybackState(
            isPlaying: isPlaying,
            progress: progressSeconds,
            duration: durationSeconds,
            track: SpotifyPlaybackState.Track(
                uri: uri,
                name: name,
                artist: artist,
                album: album,
                artworkURL: artworkURL
            ),
            volume: normalizedVolume
        )
    }

    private func extractNotificationMessage(from payload: Any) -> String? {
        if let dictionary = payload as? [String: Any] {
            if let message = dictionary["message"] as? String { return message }
            if let description = dictionary["description"] as? String { return description }
            if let note = dictionary["note"] as? String { return note }
            if JSONSerialization.isValidJSONObject(dictionary),
               let data = try? JSONSerialization.data(withJSONObject: dictionary, options: [.sortedKeys]),
               let string = String(data: data, encoding: .utf8) {
                return string
            }
        } else if let array = payload as? [Any] {
            if JSONSerialization.isValidJSONObject(array),
               let data = try? JSONSerialization.data(withJSONObject: array, options: []),
               let string = String(data: data, encoding: .utf8) {
                return string
            }
        } else if let string = payload as? String {
            return string
        }

        return stringify(value: payload)
    }

    private func stringify(value: Any) -> String? {
        if let string = value as? String {
            return string
        }
        if let number = value as? NSNumber {
            if CFGetTypeID(number) == CFBooleanGetTypeID() {
                return number.boolValue ? "true" : "false"
            }
            return number.stringValue
        }
        if value is NSNull {
            return nil
        }
        return String(describing: value)
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
