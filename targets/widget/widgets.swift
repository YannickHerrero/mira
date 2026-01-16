import WidgetKit
import SwiftUI

// MARK: - Catppuccin Macchiato Theme

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 6:
            (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: 1)
    }
}

enum Catppuccin {
    static let base = Color(hex: "#24273a")
    static let mantle = Color(hex: "#1e2030")
    static let crust = Color(hex: "#181926")
    static let surface0 = Color(hex: "#363a4f")
    static let surface1 = Color(hex: "#494d64")
    static let surface2 = Color(hex: "#5b6078")
    static let text = Color(hex: "#cad3f5")
    static let subtext1 = Color(hex: "#b8c0e0")
    static let subtext0 = Color(hex: "#a5adcb")
    static let overlay0 = Color(hex: "#6e738d")
    static let lavender = Color(hex: "#b7bdf8")
    static let blue = Color(hex: "#8aadf4")
    static let green = Color(hex: "#a6da95")
    static let peach = Color(hex: "#f5a97f")
    static let red = Color(hex: "#ed8796")
    static let mauve = Color(hex: "#c6a0f6")
}

// MARK: - Data Models

struct EpisodeInfo: Codable {
    let seasonNumber: Int
    let episodeNumber: Int
    let episodeName: String
}

struct WidgetReleaseItem: Codable, Identifiable {
    let id: Int
    let mediaType: String
    let title: String
    let posterPath: String?
    let releaseDate: String
    let releaseType: String
    let episodeInfo: EpisodeInfo?
    let score: Double?

    var formattedEpisode: String? {
        guard let info = episodeInfo else { return nil }
        return "S\(info.seasonNumber) E\(info.episodeNumber)"
    }

    var releaseDateFormatted: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        guard let date = formatter.date(from: String(releaseDate.prefix(10))) else {
            return releaseDate
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d"
        return displayFormatter.string(from: date)
    }

    var isToday: Bool {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        guard let date = formatter.date(from: String(releaseDate.prefix(10))) else { return false }
        return Calendar.current.isDateInToday(date)
    }

    var isTomorrow: Bool {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        guard let date = formatter.date(from: String(releaseDate.prefix(10))) else { return false }
        return Calendar.current.isDateInTomorrow(date)
    }

    var relativeDateLabel: String {
        if isToday { return "Today" }
        if isTomorrow { return "Tomorrow" }
        return releaseDateFormatted
    }

    var deepLinkURL: URL {
        URL(string: "mira://media/\(id)?type=\(mediaType)")!
    }
}

struct WidgetData: Codable {
    let releases: [WidgetReleaseItem]
    let mode: String
    let lastUpdated: String

    var displayMode: String {
        mode == "upcoming" ? "Upcoming" : "Recent"
    }
}

// MARK: - Timeline Entry

struct ReleaseEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
    let configuration: ConfigurationAppIntent

    var releases: [WidgetReleaseItem] {
        data?.releases ?? []
    }

    var isEmpty: Bool {
        releases.isEmpty
    }

    var isUpcoming: Bool {
        configuration.displayMode == .upcoming
    }

    var headerTitle: String {
        isUpcoming ? "Upcoming" : "Recent"
    }

    static var placeholder: ReleaseEntry {
        ReleaseEntry(
            date: Date(),
            data: WidgetData(
                releases: [
                    WidgetReleaseItem(
                        id: 1,
                        mediaType: "tv",
                        title: "Sample Show",
                        posterPath: nil,
                        releaseDate: ISO8601DateFormatter().string(from: Date()),
                        releaseType: "episode",
                        episodeInfo: EpisodeInfo(seasonNumber: 1, episodeNumber: 5, episodeName: "Sample Episode"),
                        score: 8.5
                    )
                ],
                mode: "recent",
                lastUpdated: ISO8601DateFormatter().string(from: Date())
            ),
            configuration: ConfigurationAppIntent()
        )
    }
}

// MARK: - Timeline Provider

struct Provider: AppIntentTimelineProvider {
    private let appGroupId = "group.com.yherrero.mira"
    private let recentDataKey = "widget_releases_recent"
    private let upcomingDataKey = "widget_releases_upcoming"

    func placeholder(in context: Context) -> ReleaseEntry {
        ReleaseEntry.placeholder
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> ReleaseEntry {
        let data = loadWidgetData(for: configuration.displayMode)
        return ReleaseEntry(date: Date(), data: data, configuration: configuration)
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<ReleaseEntry> {
        let data = loadWidgetData(for: configuration.displayMode)
        let entry = ReleaseEntry(date: Date(), data: data, configuration: configuration)

        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!

        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func loadWidgetData(for mode: DisplayMode) -> WidgetData? {
        let key = mode == .upcoming ? upcomingDataKey : recentDataKey

        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: key),
              let jsonData = jsonString.data(using: .utf8)
        else {
            return nil
        }

        do {
            return try JSONDecoder().decode(WidgetData.self, from: jsonData)
        } catch {
            print("Failed to decode widget data: \(error)")
            return nil
        }
    }
}

// MARK: - Release Row View

struct ReleaseRowView: View {
    let release: WidgetReleaseItem
    let showDate: Bool
    let compact: Bool

    init(release: WidgetReleaseItem, showDate: Bool = true, compact: Bool = false) {
        self.release = release
        self.showDate = showDate
        self.compact = compact
    }

    var body: some View {
        HStack(spacing: compact ? 6 : 8) {
            // Poster placeholder
            ZStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Catppuccin.surface1)
                    .frame(width: compact ? 24 : 32, height: compact ? 36 : 48)

                Image(systemName: release.mediaType == "movie" ? "film" : "tv")
                    .font(.system(size: compact ? 10 : 14))
                    .foregroundColor(Catppuccin.subtext0)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(release.title)
                    .font(.system(size: compact ? 10 : 12, weight: .medium))
                    .foregroundColor(Catppuccin.text)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    if let episode = release.formattedEpisode {
                        Text(episode)
                            .font(.system(size: compact ? 8 : 10))
                            .foregroundColor(Catppuccin.subtext0)
                    }

                    if showDate {
                        Text(release.relativeDateLabel)
                            .font(.system(size: compact ? 8 : 10))
                            .foregroundColor(release.isToday ? Catppuccin.lavender : Catppuccin.subtext0)
                    }
                }
            }

            Spacer()

            // Media type badge
            Text(release.mediaType == "movie" ? "Movie" : "TV")
                .font(.system(size: compact ? 7 : 8, weight: .medium))
                .foregroundColor(Catppuccin.lavender)
                .padding(.horizontal, compact ? 3 : 4)
                .padding(.vertical, 2)
                .background(Catppuccin.lavender.opacity(0.15))
                .cornerRadius(4)
        }
    }
}

// MARK: - Small Widget View

struct SmallWidgetView: View {
    let entry: ReleaseEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Header
            HStack(spacing: 4) {
                Image(systemName: entry.isUpcoming ? "calendar" : "play.circle.fill")
                    .font(.system(size: 10))
                    .foregroundColor(Catppuccin.lavender)
                Text(entry.headerTitle)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(Catppuccin.subtext0)
                Spacer()
            }

            Spacer()

            if entry.isEmpty {
                VStack(spacing: 4) {
                    Image(systemName: entry.isUpcoming ? "calendar.badge.checkmark" : "checkmark.circle")
                        .font(.system(size: 20))
                        .foregroundColor(Catppuccin.subtext0)
                    Text(entry.isUpcoming ? "No upcoming" : "All caught up!")
                        .font(.system(size: 10))
                        .foregroundColor(Catppuccin.subtext0)
                }
                .frame(maxWidth: .infinity)
            } else if let release = entry.releases.first {
                VStack(alignment: .leading, spacing: 2) {
                    Text(release.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Catppuccin.text)
                        .lineLimit(2)

                    if let episode = release.formattedEpisode {
                        Text(episode)
                            .font(.system(size: 11))
                            .foregroundColor(Catppuccin.subtext0)
                    }

                    HStack(spacing: 4) {
                        Text(release.mediaType == "movie" ? "Movie" : "TV")
                            .font(.system(size: 8, weight: .medium))
                            .foregroundColor(Catppuccin.lavender)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .background(Catppuccin.lavender.opacity(0.15))
                            .cornerRadius(4)

                        Text(release.relativeDateLabel)
                            .font(.system(size: 10))
                            .foregroundColor(release.isToday ? Catppuccin.lavender : Catppuccin.subtext0)
                    }
                }
            }

            Spacer()
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(entry.releases.first?.deepLinkURL)
    }
}

// MARK: - Medium Widget View

struct MediumWidgetView: View {
    let entry: ReleaseEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header
            HStack {
                Image(systemName: entry.isUpcoming ? "calendar" : "play.circle.fill")
                    .font(.system(size: 12))
                    .foregroundColor(Catppuccin.lavender)
                Text(entry.headerTitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Catppuccin.text)
                Spacer()
                Text("Mira")
                    .font(.system(size: 10))
                    .foregroundColor(Catppuccin.subtext0)
            }

            Divider()
                .background(Catppuccin.surface1)

            if entry.isEmpty {
                VStack(spacing: 4) {
                    Spacer()
                    Image(systemName: entry.isUpcoming ? "calendar.badge.checkmark" : "checkmark.circle")
                        .font(.system(size: 24))
                        .foregroundColor(Catppuccin.subtext0)
                    Text(entry.isUpcoming ? "No upcoming releases" : "All caught up!")
                        .font(.system(size: 12))
                        .foregroundColor(Catppuccin.subtext0)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                VStack(spacing: 4) {
                    ForEach(entry.releases.prefix(3)) { release in
                        Link(destination: release.deepLinkURL) {
                            ReleaseRowView(release: release, showDate: true, compact: true)
                        }
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Large Widget View

struct LargeWidgetView: View {
    let entry: ReleaseEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: entry.isUpcoming ? "calendar" : "play.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(Catppuccin.lavender)
                Text(entry.headerTitle)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Catppuccin.text)
                Spacer()
                Text("Mira")
                    .font(.system(size: 12))
                    .foregroundColor(Catppuccin.subtext0)
            }

            Divider()
                .background(Catppuccin.surface1)

            if entry.isEmpty {
                VStack(spacing: 8) {
                    Spacer()
                    Image(systemName: entry.isUpcoming ? "calendar.badge.exclamationmark" : "checkmark.circle")
                        .font(.system(size: 32))
                        .foregroundColor(Catppuccin.subtext0)
                    Text(entry.isUpcoming ? "No upcoming releases" : "All caught up!")
                        .font(.system(size: 14))
                        .foregroundColor(Catppuccin.subtext0)
                    Text("Add shows to your watchlist")
                        .font(.system(size: 12))
                        .foregroundColor(Catppuccin.overlay0)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                VStack(spacing: 6) {
                    ForEach(Array(entry.releases.prefix(6).enumerated()), id: \.element.id) { index, release in
                        Link(destination: release.deepLinkURL) {
                            ReleaseRowView(release: release, showDate: true)
                        }

                        if index < min(entry.releases.count - 1, 5) {
                            Divider()
                                .background(Catppuccin.surface0)
                        }
                    }
                }

                Spacer(minLength: 0)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Main Widget Entry View

struct MiraWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: ReleaseEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}

// MARK: - Widget Definition

struct MiraWidget: Widget {
    let kind: String = "MiraWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: Provider()
        ) { entry in
            MiraWidgetEntryView(entry: entry)
                .containerBackground(Catppuccin.base, for: .widget)
        }
        .configurationDisplayName("Mira Releases")
        .description("Track your watchlist releases")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// Keep the old name for compatibility with index.swift
typealias widget = MiraWidget

// MARK: - Previews

#Preview(as: .systemSmall) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder
}

#Preview(as: .systemMedium) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder
}

#Preview(as: .systemLarge) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder
}
