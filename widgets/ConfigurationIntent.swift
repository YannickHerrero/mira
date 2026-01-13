import WidgetKit
import AppIntents

/// Display mode for the widget - recent or upcoming releases
enum ReleaseDisplayMode: String, AppEnum {
    case recent = "recent"
    case upcoming = "upcoming"
    
    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        TypeDisplayRepresentation(name: "Display Mode")
    }
    
    static var caseDisplayRepresentations: [ReleaseDisplayMode: DisplayRepresentation] {
        [
            .recent: DisplayRepresentation(title: "Recent Releases"),
            .upcoming: DisplayRepresentation(title: "Upcoming Releases")
        ]
    }
}

/// Configuration intent for the Mira widget
/// Allows users to choose between recent and upcoming releases
struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Configure Widget"
    static var description: IntentDescription = IntentDescription("Choose what releases to display")
    
    @Parameter(title: "Display", default: .recent)
    var displayMode: ReleaseDisplayMode
    
    init() {}
    
    init(displayMode: ReleaseDisplayMode) {
        self.displayMode = displayMode
    }
}
