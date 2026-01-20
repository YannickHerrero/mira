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
 * Small widget content (2x2).
 * Shows a single featured release with poster, title, and date.
 * Will be fully implemented in Task 5.
 */
@Composable
fun SmallWidgetContent(
    release: WidgetReleaseItem,
    mode: WidgetMode
) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(12.dp),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.Start
    ) {
        // Title
        Text(
            text = release.title,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.text),
                fontSize = WidgetTheme.typography.body,
                fontWeight = FontWeight.Bold
            ),
            maxLines = 2
        )
        
        Spacer(modifier = GlanceModifier.height(4.dp))
        
        // Episode info or media type
        if (release.episodeInfo != null) {
            Text(
                text = release.episodeInfo.formatted,
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.caption
                ),
                maxLines = 1
            )
        } else {
            MediaTypeBadge(release.mediaType)
        }
        
        Spacer(modifier = GlanceModifier.defaultWeight())
        
        // Date
        DateLabel(release.getRelativeDateLabel())
    }
}
