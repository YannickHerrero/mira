import SwiftUI
import WidgetKit

// MARK: - Theme Colors

extension Color {
    static let widgetBackground = Color(red: 0.031, green: 0.031, blue: 0.039) // #08080a
    static let widgetSurface = Color(red: 0.094, green: 0.094, blue: 0.106) // #18181b
    static let widgetText = Color(red: 0.98, green: 0.98, blue: 0.98) // #fafafa
    static let widgetSubtext = Color(red: 0.64, green: 0.64, blue: 0.68) // #a3a3ad
    static let widgetAccent = Color(red: 0.71, green: 0.69, blue: 0.97) // #b5b0f7 (lavender)
}

// MARK: - Small Widget View

struct SmallWidgetView: View {
    let entry: ReleaseEntry
    
    private var headerTitle: String {
        entry.isUpcoming ? "Upcoming" : "Recent"
    }
    
    var body: some View {
        if entry.isEmpty {
            EmptyStateView(compact: true, isUpcoming: entry.isUpcoming)
        } else if let release = entry.releases.first {
            Link(destination: release.deepLinkUrl) {
                VStack(alignment: .leading, spacing: 4) {
                    // Header
                    HStack {
                        Image(systemName: entry.isUpcoming ? "calendar" : "play.circle.fill")
                            .font(.caption)
                            .foregroundColor(.widgetAccent)
                        Text(headerTitle)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.widgetSubtext)
                        Spacer()
                    }
                    
                    Spacer()
                    
                    // Title
                    Text(release.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.widgetText)
                        .lineLimit(2)
                    
                    // Subtitle
                    Text(release.subtitle)
                        .font(.caption2)
                        .foregroundColor(.widgetSubtext)
                        .lineLimit(1)
                    
                    // Badge
                    HStack(spacing: 4) {
                        Text(release.mediaType == "movie" ? "Movie" : "TV")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.widgetAccent)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.widgetAccent.opacity(0.15))
                            .cornerRadius(4)
                        
                        Text(formatDate(release.releaseDate, isUpcoming: entry.isUpcoming))
                            .font(.caption2)
                            .foregroundColor(.widgetSubtext)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .background(Color.widgetBackground)
            }
        }
    }
}

// MARK: - Medium Widget View

struct MediumWidgetView: View {
    let entry: ReleaseEntry
    
    private var headerTitle: String {
        entry.isUpcoming ? "Upcoming Releases" : "Recent Releases"
    }
    
    var body: some View {
        if entry.isEmpty {
            EmptyStateView(compact: false, isUpcoming: entry.isUpcoming)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Image(systemName: entry.isUpcoming ? "calendar" : "play.circle.fill")
                        .font(.caption)
                        .foregroundColor(.widgetAccent)
                    Text(headerTitle)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.widgetSubtext)
                    Spacer()
                }
                .padding(.bottom, 4)
                
                // Release items (up to 3)
                ForEach(entry.releases.prefix(3)) { release in
                    Link(destination: release.deepLinkUrl) {
                        MediumReleaseRow(release: release, isUpcoming: entry.isUpcoming)
                    }
                }
                
                Spacer(minLength: 0)
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .background(Color.widgetBackground)
        }
    }
}

struct MediumReleaseRow: View {
    let release: ReleaseItem
    let isUpcoming: Bool
    
    var body: some View {
        HStack(spacing: 10) {
            // Poster placeholder or icon
            ZStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.widgetSurface)
                
                if let posterUrl = release.posterUrl, let url = URL(string: posterUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: release.mediaType == "movie" ? "film" : "tv")
                            .foregroundColor(.widgetSubtext)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                } else {
                    Image(systemName: release.mediaType == "movie" ? "film" : "tv")
                        .foregroundColor(.widgetSubtext)
                }
            }
            .frame(width: 32, height: 44)
            
            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(release.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.widgetText)
                    .lineLimit(1)
                
                Text(release.subtitle)
                    .font(.caption2)
                    .foregroundColor(.widgetSubtext)
                    .lineLimit(1)
            }
            
            Spacer()
            
            // Badge
            Text(release.mediaType == "movie" ? "Movie" : "TV")
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(.widgetAccent)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color.widgetAccent.opacity(0.15))
                .cornerRadius(4)
        }
    }
}

// MARK: - Large Widget View

struct LargeWidgetView: View {
    let entry: ReleaseEntry
    
    private var headerTitle: String {
        entry.isUpcoming ? "Upcoming Releases" : "Recent Releases"
    }
    
    var body: some View {
        if entry.isEmpty {
            EmptyStateView(compact: false, isUpcoming: entry.isUpcoming)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Image(systemName: entry.isUpcoming ? "calendar" : "play.circle.fill")
                        .font(.subheadline)
                        .foregroundColor(.widgetAccent)
                    Text(headerTitle)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.widgetSubtext)
                    Spacer()
                    
                    Link(destination: URL(string: "mira://calendar")!) {
                        Text("See All")
                            .font(.caption)
                            .foregroundColor(.widgetAccent)
                    }
                }
                .padding(.bottom, 4)
                
                // Release items (up to 5)
                ForEach(entry.releases.prefix(5)) { release in
                    Link(destination: release.deepLinkUrl) {
                        LargeReleaseRow(release: release, isUpcoming: entry.isUpcoming)
                    }
                    
                    if release.id != entry.releases.prefix(5).last?.id {
                        Divider()
                            .background(Color.widgetSurface)
                    }
                }
                
                Spacer(minLength: 0)
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .background(Color.widgetBackground)
        }
    }
}

struct LargeReleaseRow: View {
    let release: ReleaseItem
    let isUpcoming: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            // Poster
            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.widgetSurface)
                
                if let posterUrl = release.posterUrl, let url = URL(string: posterUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: release.mediaType == "movie" ? "film" : "tv")
                            .foregroundColor(.widgetSubtext)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                } else {
                    Image(systemName: release.mediaType == "movie" ? "film" : "tv")
                        .foregroundColor(.widgetSubtext)
                }
            }
            .frame(width: 44, height: 60)
            
            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(release.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.widgetText)
                    .lineLimit(1)
                
                Text(release.subtitle)
                    .font(.caption)
                    .foregroundColor(.widgetSubtext)
                    .lineLimit(1)
                
                HStack(spacing: 8) {
                    Text(release.mediaType == "movie" ? "Movie" : "TV")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.widgetAccent)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.widgetAccent.opacity(0.15))
                        .cornerRadius(4)
                    
                    Text(formatDate(release.releaseDate, isUpcoming: isUpcoming))
                        .font(.caption2)
                        .foregroundColor(.widgetSubtext)
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let compact: Bool
    let isUpcoming: Bool
    
    private var icon: String {
        isUpcoming ? "calendar.badge.clock" : "checkmark.circle"
    }
    
    private var title: String {
        isUpcoming ? "No upcoming releases" : "All caught up!"
    }
    
    private var subtitle: String {
        isUpcoming ? "No upcoming releases from your watchlist" : "No recent releases from your watchlist"
    }
    
    var body: some View {
        Link(destination: URL(string: "mira://")!) {
            VStack(spacing: compact ? 4 : 8) {
                Image(systemName: icon)
                    .font(compact ? .title3 : .title2)
                    .foregroundColor(.widgetSubtext)
                
                Text(title)
                    .font(compact ? .caption : .subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.widgetText)
                
                if !compact {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundColor(.widgetSubtext)
                        .multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.widgetBackground)
        }
    }
}

// MARK: - Helper Functions

private func formatDate(_ dateString: String, isUpcoming: Bool = false) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withFullDate]
    
    guard let date = formatter.date(from: dateString) else {
        // Try simpler format
        let simpleFormatter = DateFormatter()
        simpleFormatter.dateFormat = "yyyy-MM-dd"
        guard let date = simpleFormatter.date(from: dateString) else {
            return dateString
        }
        return formatRelativeDate(date, isUpcoming: isUpcoming)
    }
    
    return formatRelativeDate(date, isUpcoming: isUpcoming)
}

private func formatRelativeDate(_ date: Date, isUpcoming: Bool = false) -> String {
    let calendar = Calendar.current
    
    if calendar.isDateInToday(date) {
        return "Today"
    } else if calendar.isDateInYesterday(date) {
        return "Yesterday"
    } else if calendar.isDateInTomorrow(date) {
        return "Tomorrow"
    } else {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}
