package {{PACKAGE_NAME}}.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import {{PACKAGE_NAME}}.widget.data.*
import {{PACKAGE_NAME}}.widget.theme.WidgetTheme
import {{PACKAGE_NAME}}.widget.ui.SmallWidgetContent
import {{PACKAGE_NAME}}.widget.ui.MediumWidgetContent
import {{PACKAGE_NAME}}.widget.ui.LargeListContent

/**
 * Main Mira Widget using Jetpack Glance.
 * Supports small (2x2), medium (4x2), and large (4x4) sizes.
 * Displays recent or upcoming releases based on configuration.
 */
class MiraWidget : GlanceAppWidget() {

    companion object {
        // Size breakpoints for responsive layouts
        private val SMALL = DpSize(110.dp, 110.dp)
        private val MEDIUM = DpSize(250.dp, 110.dp)
        private val LARGE = DpSize(250.dp, 250.dp)
    }

    // Use Exact size mode - Glance will call provideGlance for each size
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Load widget configuration from SharedPreferences before composition
        val dataProvider = WidgetDataProvider(context)
        val config = dataProvider.getWidgetConfig(0) // Default config for mode
        val mode = config.mode
        val widgetData = dataProvider.getWidgetData(mode)

        provideContent {
            GlanceTheme {
                WidgetContent(context, mode, widgetData)
            }
        }
    }

    @Composable
    private fun WidgetContent(
        context: Context,
        mode: WidgetMode,
        widgetData: WidgetData
    ) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(WidgetTheme.colors.background)
                .cornerRadius(16.dp)
                .clickable(actionStartActivity(getLaunchIntent(context))),
            contentAlignment = Alignment.Center
        ) {
            if (widgetData.releases.isEmpty()) {
                EmptyStateContent(mode)
            } else if (widgetData.releases.size >= 3) {
                // Show list content for larger data sets
                LargeListContent(
                    context = context,
                    releases = widgetData.releases.take(6),
                    mode = mode
                )
            } else {
                // Show single item for smaller data sets
                SmallWidgetContent(
                    release = widgetData.releases.first(),
                    mode = mode
                )
            }
        }
    }

    @Composable
    private fun EmptyStateContent(mode: WidgetMode) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (mode == WidgetMode.UPCOMING) "No Upcoming Releases" else "No Recent Releases",
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.text),
                    fontSize = WidgetTheme.typography.body
                )
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            Text(
                text = "Add shows to your watchlist",
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.caption
                )
            )
        }
    }

    private fun getLaunchIntent(context: Context): Intent {
        return context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent(Intent.ACTION_VIEW, Uri.parse("mira://"))
    }
}
