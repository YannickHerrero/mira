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
import androidx.glance.LocalContext
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
 * Medium widget content (4x2).
 * Shows header with up to 3 releases in a list with poster thumbnails.
 * Mirrors the iOS MediumWidgetView design.
 */
@Composable
fun MediumWidgetContent(
    releases: List<WidgetReleaseItem>,
    mode: WidgetMode
) {
    val context = LocalContext.current
    
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(12.dp)
    ) {
        // Header row
        MediumWidgetHeader(mode)
        
        Spacer(modifier = GlanceModifier.height(4.dp))
        
        // Divider
        Box(
            modifier = GlanceModifier
                .fillMaxWidth()
                .height(1.dp)
                .background(WidgetTheme.colors.surface)
        ) {}
        
        Spacer(modifier = GlanceModifier.height(4.dp))
        
        // Releases list (up to 3 items)
        if (releases.isEmpty()) {
            MediumWidgetEmptyState(mode)
        } else {
            Column(
                modifier = GlanceModifier.fillMaxWidth()
            ) {
                releases.take(3).forEachIndexed { index, release ->
                    if (index > 0) {
                        Spacer(modifier = GlanceModifier.height(4.dp))
                    }
                    
                    MediumReleaseRow(
                        context = context,
                        release = release
                    )
                }
            }
        }
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}

@Composable
private fun MediumWidgetHeader(mode: WidgetMode) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Mode icon
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
                color = ColorProvider(WidgetTheme.colors.text),
                fontSize = WidgetTheme.typography.caption,
                fontWeight = FontWeight.Medium
            )
        )
        
        Spacer(modifier = GlanceModifier.defaultWeight())
        
        // App name
        Text(
            text = "Mira",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.subtext),
                fontSize = WidgetTheme.typography.small
            )
        )
    }
}

@Composable
private fun MediumReleaseRow(
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
        MediumPosterThumbnail(
            context = context,
            release = release
        )
        
        Spacer(modifier = GlanceModifier.width(6.dp))
        
        // Title and episode info
        Column(
            modifier = GlanceModifier.defaultWeight()
        ) {
            Text(
                text = release.title,
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.text),
                    fontSize = WidgetTheme.typography.small,
                    fontWeight = FontWeight.Medium
                ),
                maxLines = 1
            )
            
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Episode info
                val episodeInfo = release.episodeInfo
                if (episodeInfo != null) {
                    Text(
                        text = episodeInfo.formatted,
                        style = TextStyle(
                            color = ColorProvider(WidgetTheme.colors.subtext),
                            fontSize = WidgetTheme.typography.badge
                        ),
                        maxLines = 1
                    )
                    
                    Spacer(modifier = GlanceModifier.width(4.dp))
                }
                
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
                        fontSize = WidgetTheme.typography.badge
                    )
                )
            }
        }
        
        Spacer(modifier = GlanceModifier.width(4.dp))
        
        // Media type badge
        MediumMediaTypeBadge(release.mediaType)
    }
}

@Composable
private fun MediumPosterThumbnail(
    context: Context,
    release: WidgetReleaseItem
) {
    val posterWidth = 24.dp
    val posterHeight = 36.dp
    
    val bitmap = loadPosterBitmapInternal(context, release.posterFilename)
    
    if (bitmap != null) {
        Image(
            provider = ImageProvider(bitmap),
            contentDescription = release.title,
            modifier = GlanceModifier
                .size(posterWidth, posterHeight)
                .cornerRadius(4.dp)
        )
    } else {
        // Placeholder
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
                    fontSize = WidgetTheme.typography.small
                )
            )
        }
    }
}

@Composable
private fun MediumMediaTypeBadge(mediaType: MediaType) {
    val badgeText = when (mediaType) {
        MediaType.MOVIE -> "Movie"
        MediaType.TV -> "TV"
    }
    
    Box(
        modifier = GlanceModifier
            .background(WidgetTheme.colors.accent.copy(alpha = 0.15f))
            .cornerRadius(4.dp)
            .padding(horizontal = 3.dp, vertical = 2.dp)
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
private fun MediumWidgetEmptyState(mode: WidgetMode) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = if (mode == WidgetMode.UPCOMING) "No upcoming releases" else "All caught up!",
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.subtext),
                fontSize = WidgetTheme.typography.caption
            )
        )
    }
}

/**
 * Load poster bitmap from cached file
 */
private fun loadPosterBitmapInternal(context: Context, filename: String?): Bitmap? {
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
