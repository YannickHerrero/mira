import WidgetKit
import SwiftUI

/// Main widget configuration for Mira
/// Displays recent or upcoming releases from the user's watchlist
/// User can configure the display mode through widget settings
@main
struct MiraWidget: Widget {
    let kind: String = "MiraWidget"
    
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: MiraTimelineProvider()
        ) { entry in
            MiraWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Mira Releases")
        .description("See releases from your watchlist.")
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

#Preview("Small - Recent", as: .systemSmall) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder(for: .recent)
    ReleaseEntry(date: Date(), releases: [], displayMode: .recent)
}

#Preview("Small - Upcoming", as: .systemSmall) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder(for: .upcoming)
    ReleaseEntry(date: Date(), releases: [], displayMode: .upcoming)
}

#Preview("Medium", as: .systemMedium) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder(for: .recent)
}

#Preview("Large", as: .systemLarge) {
    MiraWidget()
} timeline: {
    ReleaseEntry.placeholder(for: .upcoming)
}
