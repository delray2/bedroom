import SwiftUI

struct DeviceRow: View {
    let device: DeviceState

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(device.label)
                .font(.headline)
            HStack(spacing: 12) {
                ForEach(Array(device.attributes.sorted(by: { $0.key < $1.key })), id: \.0) { key, value in
                    VStack(alignment: .leading) {
                        Text(key.capitalized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(value.value)
                            .font(.subheadline)
                    }
                }
            }
        }
        .padding(.vertical, 6)
    }
}

struct DeviceRow_Previews: PreviewProvider {
    static var previews: some View {
        List {
            DeviceRow(device: DeviceState.previewDevices.first!)
        }
    }
}
