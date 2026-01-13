import WidgetKit
import Foundation

/// Data model for a single release item shown in the widget
struct ReleaseItem: Codable, Identifiable {
    let id: Int
    let mediaType: String // "movie" or "tv"
    let title: String
    let posterUrl: String?
    let releaseDate: String
    let episodeInfo: EpisodeInfo?
    
    struct EpisodeInfo: Codable {
        let season: Int
        let episode: Int
        let name: String
    }
    
    /// Formatted episode string like "S1 E5"
    var episodeString: String? {
        guard let info = episodeInfo else { return nil }
        return "S\(info.season) E\(info.episode)"
    }
    
    /// Formatted subtitle for display
    var subtitle: String {
        if let info = episodeInfo {
            return "S\(info.season) E\(info.episode) - \(info.name)"
        }
        return "Movie Release"
    }
    
    /// Deep link URL to open this media in the app
    var deepLinkUrl: URL {
        URL(string: "mira://media/\(id)?type=\(mediaType)")!
    }
}

/// Timeline entry for the widget
struct ReleaseEntry: TimelineEntry {
    let date: Date
    let releases: [ReleaseItem]
    let isPlaceholder: Bool
    
    init(date: Date, releases: [ReleaseItem], isPlaceholder: Bool = false) {
        self.date = date
        self.releases = releases
        self.isPlaceholder = isPlaceholder
    }
    
    /// Check if there are no releases to show
    var isEmpty: Bool {
        releases.isEmpty && !isPlaceholder
    }
    
    /// Static placeholder for preview/loading states
    static var placeholder: ReleaseEntry {
        ReleaseEntry(
            date: Date(),
            releases: [
                ReleaseItem(
                    id: 1,
                    mediaType: "tv",
                    title: "Sample Show",
                    posterUrl: nil,
                    releaseDate: "2024-01-15",
                    episodeInfo: ReleaseItem.EpisodeInfo(
                        season: 1,
                        episode: 5,
                        name: "Episode Title"
                    )
                ),
                ReleaseItem(
                    id: 2,
                    mediaType: "movie",
                    title: "Sample Movie",
                    posterUrl: nil,
                    releaseDate: "2024-01-14",
                    episodeInfo: nil
                ),
                ReleaseItem(
                    id: 3,
                    mediaType: "tv",
                    title: "Another Show",
                    posterUrl: nil,
                    releaseDate: "2024-01-13",
                    episodeInfo: ReleaseItem.EpisodeInfo(
                        season: 2,
                        episode: 10,
                        name: "Finale"
                    )
                )
            ],
            isPlaceholder: true
        )
    }
}
