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
 * Medium widget content (4x2).
 * Shows 2-3 releases in a horizontal list with thumbnails.
 * Will be fully implemented in Task 6.
 */
@Composable
fun MediumWidgetContent(
    releases: List<WidgetReleaseItem>,
    mode: WidgetMode
) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(8.dp)
    ) {
        // Header
        Text(
            text = mode.displayName,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.text),
                fontSize = WidgetTheme.typography.caption,
                fontWeight = FontWeight.Medium
            )
        )
        
        Spacer(modifier = GlanceModifier.height(4.dp))
        
        // Releases row
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.Start
        ) {
            releases.forEachIndexed { index, release ->
                if (index > 0) {
                    Spacer(modifier = GlanceModifier.width(8.dp))
                }
                
                MediumReleaseItem(
                    release = release,
                    modifier = GlanceModifier.defaultWeight()
                )
            }
        }
    }
}

@Composable
private fun MediumReleaseItem(
    release: WidgetReleaseItem,
    modifier: GlanceModifier = GlanceModifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.Start
    ) {
        // Title
        Text(
            text = release.title,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.text),
                fontSize = WidgetTheme.typography.caption,
                fontWeight = FontWeight.Medium
            ),
            maxLines = 1
        )
        
        // Date
        Text(
            text = release.getRelativeDateLabel(),
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.accent),
                fontSize = WidgetTheme.typography.small
            )
        )
    }
}
