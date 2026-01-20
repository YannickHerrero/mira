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
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
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

        val MODE_KEY = stringPreferencesKey("widget_mode")
    }

    override val stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition

    override val sizeMode = SizeMode.Responsive(
        setOf(SMALL, MEDIUM, LARGE)
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
        val size = LocalSize.current
        val prefs = currentState<Preferences>()

        // Get widget configuration
        val modeString = prefs[MODE_KEY] ?: WidgetMode.UPCOMING.value
        val mode = WidgetMode.fromString(modeString)

        // Load data from SharedPreferences
        val dataProvider = WidgetDataProvider(context)
        val widgetData = dataProvider.getWidgetData(mode)

        // Determine which layout to show based on size
        val isSmall = size.width < 200.dp && size.height < 200.dp
        val isMedium = size.width >= 200.dp && size.height < 200.dp
        val isLarge = size.width >= 200.dp && size.height >= 200.dp

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
                isSmall -> {
                    SmallWidgetContent(
                        release = widgetData.releases.first(),
                        mode = mode
                    )
                }
                isMedium -> {
                    MediumWidgetContent(
                        releases = widgetData.releases.take(3),
                        mode = mode
                    )
                }
                isLarge -> {
                    LargeListContent(
                        releases = widgetData.releases.take(6),
                        mode = mode
                    )
                }
                else -> {
                    SmallWidgetContent(
                        release = widgetData.releases.first(),
                        mode = mode
                    )
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

/**
 * Extension function to add corner radius to Glance modifiers.
 */
fun GlanceModifier.cornerRadius(radius: androidx.compose.ui.unit.Dp): GlanceModifier {
    return this.then(androidx.glance.appwidget.cornerRadius(radius))
}
