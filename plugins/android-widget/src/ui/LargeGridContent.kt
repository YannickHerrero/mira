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
 * Large widget grid layout (4x4).
 * Shows up to 8 releases in a Netflix-style poster grid.
 * Will be fully implemented in Task 8.
 */
@Composable
fun LargeGridContent(
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
        
        // Grid placeholder - will be implemented in Task 8
        Column(
            modifier = GlanceModifier.fillMaxSize(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Grid Layout",
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
