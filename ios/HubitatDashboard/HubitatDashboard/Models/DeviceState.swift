import Foundation

struct DeviceState: Identifiable, Codable, Hashable {
    var id: String { deviceId }
    let deviceId: String
    let label: String
    var attributes: [String: AttributeValue]

    struct AttributeValue: Codable, Hashable {
        let name: String
        let value: String
        let unit: String?
        let lastUpdated: Date?

        init(name: String, value: String, unit: String? = nil, lastUpdated: Date? = nil) {
            self.name = name
            self.value = value
            self.unit = unit
            self.lastUpdated = lastUpdated
        }

        enum CodingKeys: String, CodingKey {
            case name
            case value
            case unit
            case lastUpdated
        }
    }
}

extension DeviceState {
    static let previewDevices: [DeviceState] = [
        DeviceState(
            deviceId: "1",
            label: "Bedroom Lights",
            attributes: [
                "switch": AttributeValue(name: "switch", value: "on"),
                "level": AttributeValue(name: "level", value: "85", unit: "%")
            ]
        ),
        DeviceState(
            deviceId: "2",
            label: "Thermostat",
            attributes: [
                "temperature": AttributeValue(name: "temperature", value: "21", unit: "°C"),
                "heatingSetpoint": AttributeValue(name: "heatingSetpoint", value: "19", unit: "°C")
            ]
        )
    ]
}
