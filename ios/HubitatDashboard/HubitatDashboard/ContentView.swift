import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var viewModel: DashboardViewModel
    @Environment(\.appConfiguration) private var configuration

    var body: some View {
        NavigationStack {
            DashboardView()
                .navigationTitle("Hubitat Dashboard")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Menu {
                            Button("Refresh Devices") {
                                Task { await viewModel.refreshDevices() }
                            }
                            Button("Reconnect WebSocket") {
                                viewModel.reconnectWebSocket()
                            }
                            Divider()
                            Button(viewModel.spotifyIsAuthenticated ? "Sign out of Spotify" : "Sign in to Spotify") {
                                Task {
                                    if viewModel.spotifyIsAuthenticated {
                                        await viewModel.logoutSpotify()
                                    } else {
                                        await viewModel.authenticateSpotify(from: configuration)
                                    }
                                }
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
        }
        .task {
            await viewModel.bootstrapIfNeeded(configuration: configuration)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(DashboardViewModel(preview: true))
        .environment(\.appConfiguration, AppConfiguration.preview)
}
