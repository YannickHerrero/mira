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

// MARK: - Large Widget Layout Styles

enum LargeWidgetStyle: String, AppEnum {
    case list = "list"
    case grid = "grid"
    case featured = "featured"
    case cards = "cards"

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Layout Style" }

    static var caseDisplayRepresentations: [LargeWidgetStyle: DisplayRepresentation] {
        [
            .list: DisplayRepresentation(title: "List", subtitle: "Classic list view"),
            .grid: DisplayRepresentation(title: "Poster Grid", subtitle: "Netflix-style grid"),
            .featured: DisplayRepresentation(title: "Featured", subtitle: "Hero card with grid"),
            .cards: DisplayRepresentation(title: "Cards", subtitle: "Horizontal cards"),
        ]
    }
}

struct LargeWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Mira Library" }
    static var description: IntentDescription { "Shows your watchlist in different layouts" }

    @Parameter(title: "Display Mode", default: .recent)
    var displayMode: DisplayMode

    @Parameter(title: "Layout Style", default: .grid)
    var layoutStyle: LargeWidgetStyle
}
