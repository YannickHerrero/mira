package {{PACKAGE_NAME}}.widget.ui

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
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
import java.io.File

/**
 * Large widget list layout (4x4).
 * Shows header with up to 6 releases in a detailed list format with posters.
 * Mirrors the iOS LargeWidgetView design.
 */
@Composable
fun LargeListContent(
    context: Context,
    releases: List<WidgetReleaseItem>,
    mode: WidgetMode
) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        LargeListHeader(mode)
        
        Spacer(modifier = GlanceModifier.height(8.dp))
        
        // Divider
        Box(
            modifier = GlanceModifier
                .fillMaxWidth()
                .height(1.dp)
                .background(WidgetTheme.colors.surface)
        ) {}
        
        Spacer(modifier = GlanceModifier.height(8.dp))
        
        // Content
        if (releases.isEmpty()) {
            LargeListEmptyState(mode)
        } else {
            LargeListReleases(context, releases.take(6))
        }
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}

@Composable
private fun LargeListHeader(mode: WidgetMode) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Mode icon
        Text(
            text = if (mode == WidgetMode.UPCOMING) "\u2022" else "\u25B6",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.accent),
                fontSize = WidgetTheme.typography.body
            )
        )
        
        Spacer(modifier = GlanceModifier.width(4.dp))
        
        // Mode title
        Text(
            text = if (mode == WidgetMode.UPCOMING) "Upcoming" else "Recent",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.text),
                fontSize = WidgetTheme.typography.body,
                fontWeight = FontWeight.Bold
            )
        )
        
        Spacer(modifier = GlanceModifier.defaultWeight())
        
        // App name
        Text(
            text = "Mira",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.subtext),
                fontSize = WidgetTheme.typography.caption
            )
        )
    }
}

@Composable
private fun LargeListReleases(
    context: Context,
    releases: List<WidgetReleaseItem>
) {
    Column(
        modifier = GlanceModifier.fillMaxWidth()
    ) {
        releases.forEachIndexed { index, release ->
            LargeListReleaseRow(context, release)
            
            // Divider between items (not after last item)
            if (index < releases.size - 1) {
                Spacer(modifier = GlanceModifier.height(6.dp))
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(WidgetTheme.colors.surface.copy(alpha = 0.5f))
                ) {}
                Spacer(modifier = GlanceModifier.height(6.dp))
            }
        }
    }
}

@Composable
private fun LargeListReleaseRow(
    context: Context,
    release: WidgetReleaseItem
) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .clickable(actionStartActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(release.getDeepLinkUrl()))
            )),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Poster thumbnail
        LargeListPosterThumbnail(context, release)
        
        Spacer(modifier = GlanceModifier.width(8.dp))
        
        // Content (title, episode info)
        Column(
            modifier = GlanceModifier.defaultWeight()
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
            
            // Episode info or episode name
            val episodeInfo = release.episodeInfo
            if (episodeInfo != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = episodeInfo.formatted,
                        style = TextStyle(
                            color = ColorProvider(WidgetTheme.colors.subtext),
                            fontSize = WidgetTheme.typography.small
                        )
                    )
                }
            }
        }
        
        Spacer(modifier = GlanceModifier.width(8.dp))
        
        // Right side: Date and badge
        Column(
            horizontalAlignment = Alignment.End
        ) {
            // Media type badge
            LargeListMediaTypeBadge(release.mediaType)
            
            Spacer(modifier = GlanceModifier.height(2.dp))
            
            // Date
            Text(
                text = release.getRelativeDateLabel(),
                style = TextStyle(
                    color = ColorProvider(
                        if (release.getRelativeDateLabel() == "Today")
                            WidgetTheme.colors.accent
                        else
                            WidgetTheme.colors.subtext
                    ),
                    fontSize = WidgetTheme.typography.small
                )
            )
        }
    }
}

@Composable
private fun LargeListPosterThumbnail(
    context: Context,
    release: WidgetReleaseItem
) {
    val posterWidth = 32.dp
    val posterHeight = 48.dp
    
    val bitmap = loadPosterBitmapForList(context, release.posterFilename)
    
    if (bitmap != null) {
        Image(
            provider = ImageProvider(bitmap),
            contentDescription = release.title,
            modifier = GlanceModifier
                .size(posterWidth, posterHeight)
                .cornerRadius(4.dp)
        )
    } else {
        // Placeholder with media type icon
        Box(
            modifier = GlanceModifier
                .size(posterWidth, posterHeight)
                .background(WidgetTheme.colors.surface)
                .cornerRadius(4.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (release.mediaType == MediaType.MOVIE) "\uD83C\uDFAC" else "\uD83D\uDCFA",
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.body
                )
            )
        }
    }
}

@Composable
private fun LargeListMediaTypeBadge(mediaType: MediaType) {
    val badgeText = when (mediaType) {
        MediaType.MOVIE -> "Movie"
        MediaType.TV -> "TV"
    }
    
    Box(
        modifier = GlanceModifier
            .background(WidgetTheme.colors.accent.copy(alpha = 0.15f))
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

@Composable
private fun LargeListEmptyState(mode: WidgetMode) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Spacer(modifier = GlanceModifier.defaultWeight())
        
        Text(
            text = if (mode == WidgetMode.UPCOMING) "No upcoming releases" else "All caught up!",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.subtext),
                fontSize = WidgetTheme.typography.body
            )
        )
        
        Spacer(modifier = GlanceModifier.height(4.dp))
        
        Text(
            text = "Add shows to your watchlist",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.subtextDim),
                fontSize = WidgetTheme.typography.caption
            )
        )
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}

/**
 * Load poster bitmap from cached file
 */
private fun loadPosterBitmapForList(context: Context, filename: String?): Bitmap? {
    if (filename == null) return null

    return try {
        val postersDir = File(context.filesDir, "posters")
        val posterFile = File(postersDir, filename)
        if (posterFile.exists()) {
            BitmapFactory.decodeFile(posterFile.absolutePath)
        } else {
            null
        }
    } catch (e: Exception) {
        null
    }
}
