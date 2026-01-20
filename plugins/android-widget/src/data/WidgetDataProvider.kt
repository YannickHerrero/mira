package {{PACKAGE_NAME}}.widget.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Provider for widget data stored in SharedPreferences.
 * This class reads data that was written by the React Native app via WidgetDataModule.
 */
class WidgetDataProvider(private val context: Context) {

    companion object {
        const val PREFS_NAME = "mira_widget_prefs"
        const val KEY_RECENT_RELEASES = "widget_releases_recent"
        const val KEY_UPCOMING_RELEASES = "widget_releases_upcoming"
        const val KEY_WIDGET_CONFIG_PREFIX = "widget_config_"
    }

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Get recent releases data
     */
    fun getRecentReleases(): WidgetData? {
        val jsonString = prefs.getString(KEY_RECENT_RELEASES, null) ?: return null
        return WidgetData.fromJson(jsonString)
    }

    /**
     * Get upcoming releases data
     */
    fun getUpcomingReleases(): WidgetData? {
        val jsonString = prefs.getString(KEY_UPCOMING_RELEASES, null) ?: return null
        return WidgetData.fromJson(jsonString)
    }

    /**
     * Get widget data based on mode
     */
    fun getWidgetData(mode: WidgetMode): WidgetData {
        val data = when (mode) {
            WidgetMode.RECENT -> getRecentReleases()
            WidgetMode.UPCOMING -> getUpcomingReleases()
        }
        return data ?: WidgetData.empty(mode)
    }

    /**
     * Get configuration for a specific widget instance
     */
    fun getWidgetConfig(widgetId: Int): WidgetConfig {
        val jsonString = prefs.getString("${KEY_WIDGET_CONFIG_PREFIX}$widgetId", null)
        return WidgetConfig.fromJson(jsonString)
    }

    /**
     * Save configuration for a specific widget instance
     */
    fun saveWidgetConfig(widgetId: Int, config: WidgetConfig) {
        prefs.edit()
            .putString("${KEY_WIDGET_CONFIG_PREFIX}$widgetId", config.toJson())
            .apply()
    }

    /**
     * Delete configuration for a specific widget instance
     */
    fun deleteWidgetConfig(widgetId: Int) {
        prefs.edit()
            .remove("${KEY_WIDGET_CONFIG_PREFIX}$widgetId")
            .apply()
    }

    /**
     * Check if any data is available
     */
    fun hasData(): Boolean {
        return prefs.contains(KEY_RECENT_RELEASES) || prefs.contains(KEY_UPCOMING_RELEASES)
    }

    /**
     * Get the timestamp of the last data update
     */
    fun getLastUpdated(mode: WidgetMode): String? {
        val data = when (mode) {
            WidgetMode.RECENT -> getRecentReleases()
            WidgetMode.UPCOMING -> getUpcomingReleases()
        }
        return data?.lastUpdated
    }

    /**
     * Clear all cached data (useful for debugging)
     */
    fun clearAllData() {
        prefs.edit()
            .remove(KEY_RECENT_RELEASES)
            .remove(KEY_UPCOMING_RELEASES)
            .apply()
    }
}
