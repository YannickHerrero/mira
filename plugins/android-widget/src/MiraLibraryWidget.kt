package {{PACKAGE_NAME}}.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
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
import {{PACKAGE_NAME}}.widget.ui.LargeListContent
import {{PACKAGE_NAME}}.widget.ui.LargeGridContent
import {{PACKAGE_NAME}}.widget.ui.LargeFeaturedContent
import {{PACKAGE_NAME}}.widget.ui.LargeCardsContent

private const val TAG = "MiraLibraryWidget"

/**
 * Mira Library Widget using Jetpack Glance.
 * Large-only widget with multiple layout options: List, Grid, Featured, Cards.
 */
class MiraLibraryWidget : GlanceAppWidget() {

    companion object {
        // Large widget size
        private val LARGE = DpSize(250.dp, 250.dp)
    }

    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        try {
            // Load widget configuration from SharedPreferences before composition
            val dataProvider = WidgetDataProvider(context)
            val config = dataProvider.getWidgetConfig(0) // Default widget config
            val mode = config.mode
            val layout = config.layoutStyle
            val widgetData = dataProvider.getWidgetData(mode)

            Log.d(TAG, "provideGlance: mode=$mode, layout=$layout, releases=${widgetData.releases.size}")

            provideContent {
                GlanceTheme {
                    WidgetContent(context, mode, layout, widgetData)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in provideGlance", e)
            // Provide a fallback error UI
            provideContent {
                GlanceTheme {
                    ErrorContent(context)
                }
            }
        }
    }

    @Composable
    private fun ErrorContent(context: Context) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(WidgetTheme.colors.background))
                .cornerRadius(16.dp)
                .clickable(actionStartActivity(getLaunchIntent(context))),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Widget Error",
                    style = TextStyle(
                        color = ColorProvider(WidgetTheme.colors.text),
                        fontSize = WidgetTheme.typography.body
                    )
                )
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = "Tap to open app",
                    style = TextStyle(
                        color = ColorProvider(WidgetTheme.colors.subtext),
                        fontSize = WidgetTheme.typography.caption
                    )
                )
            }
        }
    }

    @Composable
    private fun WidgetContent(
        context: Context,
        mode: WidgetMode,
        layout: LayoutStyle,
        widgetData: WidgetData
    ) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(WidgetTheme.colors.background))
                .cornerRadius(16.dp)
                .clickable(actionStartActivity(getLaunchIntent(context))),
            contentAlignment = Alignment.Center
        ) {
            when {
                widgetData.releases.isEmpty() -> {
                    EmptyStateContent(mode)
                }
                else -> {
                    when (layout) {
                        LayoutStyle.LIST -> LargeListContent(
                            context = context,
                            releases = widgetData.releases.take(6),
                            mode = mode
                        )
                        LayoutStyle.GRID -> LargeGridContent(
                            context = context,
                            releases = widgetData.releases.take(8),
                            mode = mode
                        )
                        LayoutStyle.FEATURED -> LargeFeaturedContent(
                            context = context,
                            releases = widgetData.releases.take(5),
                            mode = mode
                        )
                        LayoutStyle.CARDS -> LargeCardsContent(
                            context = context,
                            releases = widgetData.releases.take(4),
                            mode = mode
                        )
                    }
                }
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
