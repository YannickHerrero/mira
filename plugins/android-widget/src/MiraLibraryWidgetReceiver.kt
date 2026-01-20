package {{PACKAGE_NAME}}.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Broadcast receiver for the Mira Library Widget.
 * This receiver handles widget update broadcasts for the library widget with layout options.
 */
class MiraLibraryWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MiraLibraryWidget()
}
