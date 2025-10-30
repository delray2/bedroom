import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var viewModel: DashboardViewModel

    var body: some View {
        List {
            Section(header: statusHeader) {
                ForEach(viewModel.devices) { device in
                    NavigationLink(destination: DeviceDetailView(device: device)) {
                        DeviceRow(device: device)
                    }
                }
            }

            if let spotifyState = viewModel.spotifyState {
                Section("Spotify") {
                    SpotifyPlayerView(state: spotifyState)
                        .environmentObject(viewModel)
                }
            } else {
                Section("Spotify") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Not signed in")
                            .font(.headline)
                        Text("Use the toolbar to authenticate with Spotify.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 8)
                }
            }
        }
        .listStyle(.insetGrouped)
        .alert(item: $viewModel.errorMessage.map(IdentifiedError.init)) { error in
            Alert(title: Text("Error"), message: Text(error.message), dismissButton: .default(Text("OK")))
        }
    }

    private var statusHeader: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(statusColor)
                .frame(width: 12, height: 12)
            Text("Realtime updates: \(viewModel.connectionStatus.rawValue.capitalized)")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private var statusColor: Color {
        switch viewModel.connectionStatus {
        case .connected: return .green
        case .connecting: return .yellow
        case .disconnected: return .red
        }
    }
}

private struct IdentifiedError: Identifiable {
    let id = UUID()
    let message: String
}

struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            DashboardView()
                .environmentObject(DashboardViewModel(preview: true))
        }
    }
}
