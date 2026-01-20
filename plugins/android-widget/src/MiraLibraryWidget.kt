package {{PACKAGE_NAME}}.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent

/**
 * Mira Library Widget using Jetpack Glance.
 * Large-only widget with multiple layout options: List, Grid, Featured, Cards.
 */
class MiraLibraryWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            // Widget content will be implemented in Task 7
            LibraryWidgetContent(context, id)
        }
    }
}
