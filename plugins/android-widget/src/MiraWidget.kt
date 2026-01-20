package {{PACKAGE_NAME}}.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent

/**
 * Main Mira Widget using Jetpack Glance.
 * Supports small (2x2), medium (4x2), and large (4x4) sizes.
 * Displays recent or upcoming releases based on configuration.
 */
class MiraWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            // Widget content will be implemented in Task 5
            WidgetContent(context, id)
        }
    }
}
