package {{PACKAGE_NAME}}.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.GlanceAppWidgetManager
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import {{PACKAGE_NAME}}.widget.data.WidgetDataProvider

/**
 * Broadcast receiver for the Mira Widget.
 * Handles widget update broadcasts and instantiates the widget.
 */
class MiraWidgetReceiver : GlanceAppWidgetReceiver() {

    override val glanceAppWidget: GlanceAppWidget = MiraWidget()

    private val coroutineScope = MainScope()

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)

        // Trigger widget update - config is loaded in provideGlance
        coroutineScope.launch {
            appWidgetIds.forEach { widgetId ->
                glanceAppWidget.update(
                    context,
                    GlanceAppWidgetManager(context).getGlanceIdBy(widgetId)
                )
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)

        // Clean up widget configuration when widget is removed
        val dataProvider = WidgetDataProvider(context)
        appWidgetIds.forEach { widgetId ->
            dataProvider.deleteWidgetConfig(widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        // Handle custom update action from the app
        if (intent.action == ACTION_UPDATE_WIDGET) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, MiraWidgetReceiver::class.java)
            )
            onUpdate(context, appWidgetManager, widgetIds)
        }
    }

    companion object {
        const val ACTION_UPDATE_WIDGET = "{{PACKAGE_NAME}}.widget.ACTION_UPDATE_WIDGET"
    }
}
