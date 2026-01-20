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
 * Large widget list layout (4x4).
 * Shows up to 6 releases in a detailed list format.
 * Will be fully implemented in Task 7.
 */
@Composable
fun LargeListContent(
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
        
        // Releases list
        releases.forEachIndexed { index, release ->
            if (index > 0) {
                Spacer(modifier = GlanceModifier.height(8.dp))
            }
            
            ListReleaseItem(release)
        }
    }
}

@Composable
private fun ListReleaseItem(release: WidgetReleaseItem) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Poster placeholder
        PosterImage(
            release = release,
            modifier = GlanceModifier.size(40.dp, 60.dp)
        )
        
        Spacer(modifier = GlanceModifier.width(12.dp))
        
        // Content
        Column(
            modifier = GlanceModifier.defaultWeight()
        ) {
            // Title
            Text(
                text = release.title,
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.text),
                    fontSize = WidgetTheme.typography.body,
                    fontWeight = FontWeight.Medium
                ),
                maxLines = 1
            )
            
            // Episode info
            if (release.episodeInfo != null) {
                Text(
                    text = release.episodeInfo.formatted,
                    style = TextStyle(
                        color = ColorProvider(WidgetTheme.colors.subtext),
                        fontSize = WidgetTheme.typography.caption
                    ),
                    maxLines = 1
                )
            }
        }
        
        // Date
        Column(
            horizontalAlignment = Alignment.End
        ) {
            DateLabel(release.getRelativeDateLabel())
            
            if (release.score != null) {
                Spacer(modifier = GlanceModifier.height(2.dp))
                Text(
                    text = release.getFormattedScore() ?: "",
                    style = TextStyle(
                        color = ColorProvider(WidgetTheme.colors.warning),
                        fontSize = WidgetTheme.typography.caption
                    )
                )
            }
        }
    }
}
