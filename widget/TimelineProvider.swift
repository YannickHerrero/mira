import WidgetKit
import Foundation

/// Provides timeline entries for the Mira widget
struct MiraTimelineProvider: TimelineProvider {
    
    /// App Group identifier for shared data access
    /// This should match the value configured in the main app
    private var appGroupIdentifier: String {
        // Try to get from Info.plist, fall back to default
        if let identifier = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String {
            return identifier
        }
        return "group.com.yherrero.mira"
    }
    
    /// Key used to store releases data in UserDefaults
    private let releasesKey = "widget_releases"
    
    // MARK: - TimelineProvider Protocol
    
    func placeholder(in context: Context) -> ReleaseEntry {
        ReleaseEntry.placeholder
    }
    
    func getSnapshot(in context: Context, completion: @escaping (ReleaseEntry) -> Void) {
        let entry = loadEntry()
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<ReleaseEntry>) -> Void) {
        let entry = loadEntry()
        
        // Refresh timeline every hour
        // The widget will update when the user opens the app and new data is written
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    // MARK: - Data Loading
    
    /// Load releases from App Group shared storage
    private func loadEntry() -> ReleaseEntry {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            print("[MiraWidget] Failed to access App Group UserDefaults")
            return ReleaseEntry(date: Date(), releases: [])
        }
        
        guard let data = userDefaults.data(forKey: releasesKey) else {
            print("[MiraWidget] No releases data found in UserDefaults")
            return ReleaseEntry(date: Date(), releases: [])
        }
        
        do {
            let releases = try JSONDecoder().decode([ReleaseItem].self, from: data)
            print("[MiraWidget] Loaded \(releases.count) releases")
            return ReleaseEntry(date: Date(), releases: releases)
        } catch {
            print("[MiraWidget] Failed to decode releases: \(error)")
            return ReleaseEntry(date: Date(), releases: [])
        }
    }
}
