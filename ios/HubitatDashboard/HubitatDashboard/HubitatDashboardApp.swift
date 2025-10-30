import SwiftUI

@main
struct HubitatDashboardApp: App {
    @StateObject private var viewModel = DashboardViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
                .environment(\.appConfiguration, AppConfiguration.loadDefault())
        }
    }
}
