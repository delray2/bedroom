import Foundation

actor HubitatService {
    private let baseURL: URL
    private let decoder: JSONDecoder

    init(baseURL: URL) {
        self.baseURL = baseURL
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder
    }

    func fetchDevices() async throws -> [DeviceState] {
        let url = baseURL.appending(path: "/devices")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw ServiceError.invalidResponse
        }
        return try decoder.decode([DeviceState].self, from: data)
    }

    enum ServiceError: Error {
        case invalidResponse
    }
}
