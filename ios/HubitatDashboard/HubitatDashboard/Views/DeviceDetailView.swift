import SwiftUI

struct DeviceDetailView: View {
    let device: DeviceState

    var body: some View {
        List {
            Section(header: Text(device.label)) {
                ForEach(Array(device.attributes.sorted(by: { $0.key < $1.key })), id: \.0) { key, value in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(key.capitalized)
                            .font(.headline)
                        Text(value.value)
                            .font(.body)
                        if let unit = value.unit {
                            Text(unit)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        if let updated = value.lastUpdated {
                            Text("Updated \(updated.formatted(.relative(presentation: .named)))")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle(device.label)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DeviceDetailView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            DeviceDetailView(device: DeviceState.previewDevices.first!)
        }
    }
}
