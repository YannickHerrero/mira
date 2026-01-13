import WidgetKit
import Foundation

/// Provides timeline entries for the Mira widget
/// Supports both recent and upcoming releases based on user configuration
struct MiraTimelineProvider: AppIntentTimelineProvider {
    
    /// App Group identifier for shared data access
    /// This should match the value configured in the main app
    private var appGroupIdentifier: String {
        // Try to get from Info.plist, fall back to default
        if let identifier = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String {
            return identifier
        }
        return "group.com.yherrero.mira"
    }
    
    /// Storage keys for recent and upcoming releases
    private let recentReleasesKey = "widget_releases_recent"
    private let upcomingReleasesKey = "widget_releases_upcoming"
    
    // MARK: - AppIntentTimelineProvider Protocol
    
    func placeholder(in context: Context) -> ReleaseEntry {
        ReleaseEntry.placeholder(for: .recent)
    }
    
    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> ReleaseEntry {
        loadEntry(for: configuration.displayMode)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<ReleaseEntry> {
        let entry = loadEntry(for: configuration.displayMode)
        
        // Refresh timeline every hour
        // The widget will update when the user opens the app and new data is written
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
    
    // MARK: - Data Loading
    
    /// Load releases from App Group shared storage based on display mode
    private func loadEntry(for displayMode: ReleaseDisplayMode) -> ReleaseEntry {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            print("[MiraWidget] Failed to access App Group UserDefaults")
            return ReleaseEntry(date: Date(), releases: [], displayMode: displayMode)
        }
        
        let storageKey = displayMode == .recent ? recentReleasesKey : upcomingReleasesKey
        
        guard let data = userDefaults.data(forKey: storageKey) else {
            print("[MiraWidget] No \(displayMode.rawValue) releases data found in UserDefaults")
            return ReleaseEntry(date: Date(), releases: [], displayMode: displayMode)
        }
        
        do {
            let releases = try JSONDecoder().decode([ReleaseItem].self, from: data)
            print("[MiraWidget] Loaded \(releases.count) \(displayMode.rawValue) releases")
            return ReleaseEntry(date: Date(), releases: releases, displayMode: displayMode)
        } catch {
            print("[MiraWidget] Failed to decode releases: \(error)")
            return ReleaseEntry(date: Date(), releases: [], displayMode: displayMode)
        }
    }
}
