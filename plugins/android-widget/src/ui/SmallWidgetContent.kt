package {{PACKAGE_NAME}}.widget.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.text.FontWeight
import androidx.glance.unit.ColorProvider
import {{PACKAGE_NAME}}.widget.data.WidgetReleaseItem
import {{PACKAGE_NAME}}.widget.data.WidgetMode
import {{PACKAGE_NAME}}.widget.data.MediaType
import {{PACKAGE_NAME}}.widget.theme.WidgetTheme

/**
 * Small widget content (2x2).
 * Shows a single featured release with header, title, episode info, and date.
 * Mirrors the iOS SmallWidgetView design.
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
        // Header row with icon and mode title
        SmallWidgetHeader(mode)
        
        Spacer(modifier = GlanceModifier.defaultWeight())
        
        // Main content: Title, episode info, badge + date
        SmallWidgetMainContent(release)
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}

@Composable
private fun SmallWidgetHeader(mode: WidgetMode) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Mode icon (calendar for upcoming, play for recent)
        Text(
            text = if (mode == WidgetMode.UPCOMING) "\u2022" else "\u25B6",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.accent),
                fontSize = WidgetTheme.typography.caption
            )
        )
        
        Spacer(modifier = GlanceModifier.width(4.dp))
        
        // Mode title
        Text(
            text = if (mode == WidgetMode.UPCOMING) "Upcoming" else "Recent",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.subtext),
                fontSize = WidgetTheme.typography.caption,
                fontWeight = FontWeight.Medium
            )
        )
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}

@Composable
private fun SmallWidgetMainContent(release: WidgetReleaseItem) {
    Column(
        horizontalAlignment = Alignment.Start
    ) {
        // Title (up to 2 lines)
        Text(
            text = release.title,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.text),
                fontSize = WidgetTheme.typography.body,
                fontWeight = FontWeight.Bold
            ),
            maxLines = 2
        )
        
        Spacer(modifier = GlanceModifier.height(2.dp))
        
        // Episode info (if TV show)
        val episodeInfo = release.episodeInfo
        if (episodeInfo != null) {
            Text(
                text = episodeInfo.formatted,
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.caption
                ),
                maxLines = 1
            )
            
            Spacer(modifier = GlanceModifier.height(4.dp))
        }
        
        // Badge and date row
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Media type badge
            SmallMediaTypeBadge(release.mediaType)
            
            Spacer(modifier = GlanceModifier.width(6.dp))
            
            // Date label
            Text(
                text = release.getRelativeDateLabel(),
                style = TextStyle(
                    color = ColorProvider(
                        if (release.getRelativeDateLabel() == "Today") 
                            WidgetTheme.colors.accent 
                        else 
                            WidgetTheme.colors.subtext
                    ),
                    fontSize = WidgetTheme.typography.caption
                )
            )
        }
    }
}

@Composable
private fun SmallMediaTypeBadge(mediaType: MediaType) {
    val badgeText = when (mediaType) {
        MediaType.MOVIE -> "Movie"
        MediaType.TV -> "TV"
    }
    
    Box(
        modifier = GlanceModifier
            .background(ColorProvider(WidgetTheme.colors.accent.copy(alpha = 0.15f)))
            .cornerRadius(4.dp)
            .padding(horizontal = 4.dp, vertical = 2.dp)
    ) {
        Text(
            text = badgeText,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.accent),
                fontSize = WidgetTheme.typography.badge,
                fontWeight = FontWeight.Medium
            )
        )
    }
}

/**
 * Empty state for small widget when no releases are available.
 */
@Composable
fun SmallWidgetEmptyState(mode: WidgetMode) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(12.dp),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.Start
    ) {
        // Header
        SmallWidgetHeader(mode)
        
        Spacer(modifier = GlanceModifier.defaultWeight())
        
        // Empty state message
        Column(
            modifier = GlanceModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = if (mode == WidgetMode.UPCOMING) "No upcoming" else "All caught up!",
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.caption
                )
            )
        }
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}
