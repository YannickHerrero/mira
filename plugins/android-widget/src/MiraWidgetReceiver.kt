package {{PACKAGE_NAME}}.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Broadcast receiver for the Mira Widget.
 * This receiver handles widget update broadcasts and instantiates the widget.
 */
class MiraWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MiraWidget()
}
