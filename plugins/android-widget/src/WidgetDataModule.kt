package {{PACKAGE_NAME}}.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native native module for widget data management.
 * Provides methods to store widget data in SharedPreferences and trigger widget updates.
 */
class WidgetDataModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "MiraWidgetData"
        const val PREFS_NAME = "mira_widget_prefs"
        const val KEY_RECENT_RELEASES = "widget_releases_recent"
        const val KEY_UPCOMING_RELEASES = "widget_releases_upcoming"
        const val KEY_WIDGET_CONFIG_PREFIX = "widget_config_"
    }

    override fun getName(): String = NAME

    /**
     * Store recent releases data for the widget
     */
    @ReactMethod
    fun setRecentReleases(jsonData: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_RECENT_RELEASES, jsonData).apply()
            updateWidgets()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to save recent releases: ${e.message}", e)
        }
    }

    /**
     * Store upcoming releases data for the widget
     */
    @ReactMethod
    fun setUpcomingReleases(jsonData: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_UPCOMING_RELEASES, jsonData).apply()
            updateWidgets()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to save upcoming releases: ${e.message}", e)
        }
    }

    /**
     * Store widget configuration
     */
    @ReactMethod
    fun setWidgetConfig(widgetId: Int, configJson: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString("${KEY_WIDGET_CONFIG_PREFIX}$widgetId", configJson).apply()
            updateWidget(widgetId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to save widget config: ${e.message}", e)
        }
    }

    /**
     * Get widget configuration
     */
    @ReactMethod
    fun getWidgetConfig(widgetId: Int, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val config = prefs.getString("${KEY_WIDGET_CONFIG_PREFIX}$widgetId", null)
            promise.resolve(config)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get widget config: ${e.message}", e)
        }
    }

    /**
     * Trigger update for all Mira widgets
     */
    @ReactMethod
    fun updateAllWidgets(promise: Promise) {
        try {
            updateWidgets()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to update widgets: ${e.message}", e)
        }
    }

    /**
     * Check if any widgets are installed
     */
    @ReactMethod
    fun hasActiveWidgets(promise: Promise) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            
            val miraWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(reactApplicationContext, MiraWidgetReceiver::class.java)
            )
            val libraryWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(reactApplicationContext, MiraLibraryWidgetReceiver::class.java)
            )
            
            promise.resolve(miraWidgetIds.isNotEmpty() || libraryWidgetIds.isNotEmpty())
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check active widgets: ${e.message}", e)
        }
    }

    /**
     * Get debug information about widget data storage
     * Returns JSON with release counts, last updated times, and widget counts
     */
    @ReactMethod
    fun getDebugInfo(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            
            // Parse recent releases
            val recentJson = prefs.getString(KEY_RECENT_RELEASES, null)
            var recentCount = 0
            var recentLastUpdated: String? = null
            if (recentJson != null) {
                try {
                    val json = org.json.JSONObject(recentJson)
                    recentCount = json.optJSONArray("releases")?.length() ?: 0
                    recentLastUpdated = json.optString("lastUpdated", null)
                } catch (e: Exception) {
                    // Ignore parse errors
                }
            }
            
            // Parse upcoming releases
            val upcomingJson = prefs.getString(KEY_UPCOMING_RELEASES, null)
            var upcomingCount = 0
            var upcomingLastUpdated: String? = null
            if (upcomingJson != null) {
                try {
                    val json = org.json.JSONObject(upcomingJson)
                    upcomingCount = json.optJSONArray("releases")?.length() ?: 0
                    upcomingLastUpdated = json.optString("lastUpdated", null)
                } catch (e: Exception) {
                    // Ignore parse errors
                }
            }
            
            // Get widget counts
            val miraWidgetCount = appWidgetManager.getAppWidgetIds(
                ComponentName(reactApplicationContext, MiraWidgetReceiver::class.java)
            ).size
            val libraryWidgetCount = appWidgetManager.getAppWidgetIds(
                ComponentName(reactApplicationContext, MiraLibraryWidgetReceiver::class.java)
            ).size
            
            // Build result JSON
            val result = org.json.JSONObject().apply {
                put("recentReleasesCount", recentCount)
                put("recentLastUpdated", recentLastUpdated)
                put("upcomingReleasesCount", upcomingCount)
                put("upcomingLastUpdated", upcomingLastUpdated)
                put("miraWidgetCount", miraWidgetCount)
                put("libraryWidgetCount", libraryWidgetCount)
                put("hasData", recentJson != null || upcomingJson != null)
            }
            
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get debug info: ${e.message}", e)
        }
    }

    /**
     * Internal: Update all Mira widgets
     */
    private fun updateWidgets() {
        val context = reactApplicationContext
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // Update MiraWidget instances
        val miraWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, MiraWidgetReceiver::class.java)
        )
        if (miraWidgetIds.isNotEmpty()) {
            val intent = Intent(context, MiraWidgetReceiver::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, miraWidgetIds)
            }
            context.sendBroadcast(intent)
        }

        // Update MiraLibraryWidget instances
        val libraryWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, MiraLibraryWidgetReceiver::class.java)
        )
        if (libraryWidgetIds.isNotEmpty()) {
            val intent = Intent(context, MiraLibraryWidgetReceiver::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, libraryWidgetIds)
            }
            context.sendBroadcast(intent)
        }
    }

    /**
     * Internal: Update a specific widget
     */
    private fun updateWidget(widgetId: Int) {
        val context = reactApplicationContext
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // Try to update as MiraWidget
        val miraWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, MiraWidgetReceiver::class.java)
        )
        if (widgetId in miraWidgetIds) {
            val intent = Intent(context, MiraWidgetReceiver::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            context.sendBroadcast(intent)
            return
        }

        // Try to update as MiraLibraryWidget
        val libraryWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, MiraLibraryWidgetReceiver::class.java)
        )
        if (widgetId in libraryWidgetIds) {
            val intent = Intent(context, MiraLibraryWidgetReceiver::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            context.sendBroadcast(intent)
        }
    }
}
