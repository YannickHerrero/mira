import WidgetKit
import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Mira Releases" }
    static var description: IntentDescription { "Shows your watchlist releases" }

    @Parameter(title: "Display Mode", default: .recent)
    var displayMode: DisplayMode
}

enum DisplayMode: String, AppEnum {
    case recent = "recent"
    case upcoming = "upcoming"

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Display Mode" }

    static var caseDisplayRepresentations: [DisplayMode: DisplayRepresentation] {
        [
            .recent: DisplayRepresentation(title: "Recent Releases", subtitle: "Recently aired episodes"),
            .upcoming: DisplayRepresentation(title: "Upcoming Releases", subtitle: "Episodes airing soon"),
        ]
    }
}
