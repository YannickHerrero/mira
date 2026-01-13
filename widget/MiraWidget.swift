import WidgetKit
import SwiftUI

/// Main widget configuration for Mira
/// Displays recent releases from the user's watchlist
@main
struct MiraWidget: Widget {
    let kind: String = "MiraWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MiraTimelineProvider()) { entry in
            MiraWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Recent Releases")
        .description("See the latest releases from your watchlist.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

/// Entry view that switches between widget sizes
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
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Preview Provider

#Preview("Small", as: .systemSmall) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder
    ReleaseEntry(date: Date(), releases: [])
}

#Preview("Medium", as: .systemMedium) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder
}

#Preview("Large", as: .systemLarge) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder
}
