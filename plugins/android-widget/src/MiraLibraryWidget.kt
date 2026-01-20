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
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.*
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import {{PACKAGE_NAME}}.widget.data.*
import {{PACKAGE_NAME}}.widget.theme.WidgetTheme
import {{PACKAGE_NAME}}.widget.ui.LargeListContent
import {{PACKAGE_NAME}}.widget.ui.LargeGridContent
import {{PACKAGE_NAME}}.widget.ui.LargeFeaturedContent
import {{PACKAGE_NAME}}.widget.ui.LargeCardsContent

/**
 * Mira Library Widget using Jetpack Glance.
 * Large-only widget with multiple layout options: List, Grid, Featured, Cards.
 */
class MiraLibraryWidget : GlanceAppWidget() {

    companion object {
        // Large widget size
        private val LARGE = DpSize(250.dp, 250.dp)

        val MODE_KEY = stringPreferencesKey("widget_mode")
        val LAYOUT_KEY = stringPreferencesKey("widget_layout")
    }

    override val stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition

    override val sizeMode = SizeMode.Responsive(
        setOf(LARGE)
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            GlanceTheme {
                WidgetContent()
            }
        }
    }

    @Composable
    private fun WidgetContent() {
        val context = LocalContext.current
        val prefs = currentState<Preferences>()

        // Get widget configuration
        val modeString = prefs[MODE_KEY] ?: WidgetMode.UPCOMING.value
        val layoutString = prefs[LAYOUT_KEY] ?: LayoutStyle.LIST.value
        val mode = WidgetMode.fromString(modeString)
        val layout = LayoutStyle.fromString(layoutString)

        // Load data from SharedPreferences
        val dataProvider = WidgetDataProvider(context)
        val widgetData = dataProvider.getWidgetData(mode)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(WidgetTheme.colors.background)
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
                            releases = widgetData.releases.take(6),
                            mode = mode
                        )
                        LayoutStyle.GRID -> LargeGridContent(
                            releases = widgetData.releases.take(8),
                            mode = mode
                        )
                        LayoutStyle.FEATURED -> LargeFeaturedContent(
                            releases = widgetData.releases.take(5),
                            mode = mode
                        )
                        LayoutStyle.CARDS -> LargeCardsContent(
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
