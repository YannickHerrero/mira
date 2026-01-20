package {{PACKAGE_NAME}}.widget.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.text.FontWeight
import androidx.glance.unit.ColorProvider
import {{PACKAGE_NAME}}.widget.data.WidgetReleaseItem
import {{PACKAGE_NAME}}.widget.data.WidgetMode
import {{PACKAGE_NAME}}.widget.theme.WidgetTheme

/**
 * Large widget cards layout (4x4).
 * Shows horizontal cards with poster and detailed info.
 * Will be fully implemented in Task 10.
 */
@Composable
fun LargeCardsContent(
    releases: List<WidgetReleaseItem>,
    mode: WidgetMode
) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(12.dp)
    ) {
        // Header
        WidgetHeader(mode)
        
        Spacer(modifier = GlanceModifier.height(8.dp))
        
        // Cards layout placeholder - will be implemented in Task 10
        Column(
            modifier = GlanceModifier.fillMaxSize(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Cards Layout",
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.body
                )
            )
            Text(
                text = "${releases.size} releases",
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtextDim),
                    fontSize = WidgetTheme.typography.caption
                )
            )
        }
    }
}
