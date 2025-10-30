import SwiftUI

struct SpotifyPlayerView: View {
    @EnvironmentObject private var viewModel: DashboardViewModel
    let state: SpotifyPlaybackState
    @State private var volume: Double

    init(state: SpotifyPlaybackState) {
        self.state = state
        self._volume = State(initialValue: state.volume)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                AsyncImage(url: state.track.artworkURL) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        Color.secondary
                    @unknown default:
                        Color.secondary
                    }
                }
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 4) {
                    Text(state.track.name)
                        .font(.headline)
                    Text(state.track.artist)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(state.track.album)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            ProgressView(value: state.progress / max(state.duration, 1))
            HStack {
                Text(format(time: state.progress))
                    .font(.footnote)
                Spacer()
                Text(format(time: state.duration))
                    .font(.footnote)
            }
            .foregroundStyle(.secondary)

            HStack(spacing: 24) {
                Button(action: { Task { await viewModel.skipPrevious() } }) {
                    Image(systemName: "backward.fill")
                        .font(.title2)
                }
                Button(action: { Task { await viewModel.playPause() } }) {
                    Image(systemName: state.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.largeTitle)
                }
                Button(action: { Task { await viewModel.skipNext() } }) {
                    Image(systemName: "forward.fill")
                        .font(.title2)
                }
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)

            VStack(alignment: .leading) {
                Text("Volume")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Slider(value: $volume, in: 0...1, onEditingChanged: { editing in
                    guard !editing else { return }
                    Task { await viewModel.setVolume(to: volume) }
                })
            }
        }
        .padding(.vertical, 8)
        .onChange(of: state.volume) { _, newValue in
            volume = newValue
        }
    }

    private func format(time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

struct SpotifyPlayerView_Previews: PreviewProvider {
    static var previews: some View {
        SpotifyPlayerView(state: .preview)
            .environmentObject(DashboardViewModel(preview: true))
    }
}
