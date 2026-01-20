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
 * Large widget featured layout (4x4).
 * Shows a hero card for the first item with a poster grid below.
 * Mirrors the iOS LargeWidgetFeaturedView design.
 */
@Composable
fun LargeFeaturedContent(
    releases: List<WidgetReleaseItem>,
    mode: WidgetMode
) {
    val context = LocalContext.current
    
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(14.dp)
    ) {
        // Header
        FeaturedHeader(mode)
        
        Spacer(modifier = GlanceModifier.height(10.dp))
        
        // Content
        if (releases.isEmpty()) {
            FeaturedEmptyState(mode)
        } else {
            // Featured card for first release
            releases.firstOrNull()?.let { featured ->
                FeaturedCard(context, featured)
            }
            
            Spacer(modifier = GlanceModifier.height(10.dp))
            
            // Remaining items in grid (up to 4)
            if (releases.size > 1) {
                SmallPosterGrid(context, releases.drop(1).take(4))
            }
        }
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}

@Composable
private fun FeaturedHeader(mode: WidgetMode) {
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
                fontWeight = FontWeight.Bold
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
private fun FeaturedCard(
    context: Context,
    release: WidgetReleaseItem
) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .background(WidgetTheme.colors.surface.copy(alpha = 0.5f))
            .cornerRadius(12.dp)
            .padding(10.dp)
            .clickable(actionStartActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(release.getDeepLinkUrl()))
            )),
        verticalAlignment = Alignment.Top
    ) {
        // Large poster
        FeaturedPoster(context, release)
        
        Spacer(modifier = GlanceModifier.width(12.dp))
        
        // Info column
        Column(
            modifier = GlanceModifier.defaultWeight()
        ) {
            // Title
            Text(
                text = release.title,
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.text),
                    fontSize = WidgetTheme.typography.title,
                    fontWeight = FontWeight.Bold
                ),
                maxLines = 2
            )
            
            Spacer(modifier = GlanceModifier.height(4.dp))
            
            // Episode info
            val episodeInfo = release.episodeInfo
            if (episodeInfo != null) {
                Text(
                    text = episodeInfo.formatted,
                    style = TextStyle(
                        color = ColorProvider(WidgetTheme.colors.subtext),
                        fontSize = WidgetTheme.typography.caption
                    )
                )
                
                // Episode name (if available)
                if (episodeInfo.episodeName.isNotBlank()) {
                    Text(
                        text = episodeInfo.episodeName,
                        style = TextStyle(
                            color = ColorProvider(WidgetTheme.colors.subtextDim),
                            fontSize = WidgetTheme.typography.small
                        ),
                        maxLines = 1
                    )
                }
            }
            
            Spacer(modifier = GlanceModifier.height(8.dp))
            
            // Date and badge row
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
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
                        fontSize = WidgetTheme.typography.small,
                        fontWeight = FontWeight.Medium
                    )
                )
                
                Spacer(modifier = GlanceModifier.width(6.dp))
                
                // Separator
                Text(
                    text = "\u2022",
                    style = TextStyle(
                        color = ColorProvider(WidgetTheme.colors.subtextDim),
                        fontSize = WidgetTheme.typography.small
                    )
                )
                
                Spacer(modifier = GlanceModifier.width(6.dp))
                
                // Media type badge
                FeaturedMediaTypeBadge(release.mediaType)
            }
        }
    }
}

@Composable
private fun FeaturedPoster(
    context: Context,
    release: WidgetReleaseItem
) {
    val posterWidth = 80.dp
    val posterHeight = 120.dp
    
    val bitmap = loadFeaturedPosterBitmap(context, release.posterFilename)
    
    Box(
        modifier = GlanceModifier
            .size(posterWidth, posterHeight)
            .background(WidgetTheme.colors.surface)
            .cornerRadius(8.dp),
        contentAlignment = Alignment.Center
    ) {
        if (bitmap != null) {
            Image(
                provider = ImageProvider(bitmap),
                contentDescription = release.title,
                modifier = GlanceModifier
                    .fillMaxSize()
                    .cornerRadius(8.dp)
            )
        } else {
            // Placeholder icon
            Text(
                text = if (release.mediaType == MediaType.MOVIE) "\uD83C\uDFAC" else "\uD83D\uDCFA",
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.largeTitle
                )
            )
        }
    }
}

@Composable
private fun FeaturedMediaTypeBadge(mediaType: MediaType) {
    val badgeText = when (mediaType) {
        MediaType.MOVIE -> "Movie"
        MediaType.TV -> "TV"
    }
    
    Box(
        modifier = GlanceModifier
            .background(WidgetTheme.colors.accent.copy(alpha = 0.15f))
            .cornerRadius(4.dp)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            text = badgeText,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.accent),
                fontSize = WidgetTheme.typography.small,
                fontWeight = FontWeight.Medium
            )
        )
    }
}

@Composable
private fun SmallPosterGrid(
    context: Context,
    releases: List<WidgetReleaseItem>
) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        releases.forEachIndexed { index, release ->
            if (index > 0) {
                Spacer(modifier = GlanceModifier.width(8.dp))
            }
            
            SmallPosterItem(
                context = context,
                release = release,
                modifier = GlanceModifier.defaultWeight()
            )
        }
        
        // Fill remaining space if fewer than 4 items
        repeat(4 - releases.size) {
            Spacer(modifier = GlanceModifier.width(8.dp))
            Spacer(modifier = GlanceModifier.defaultWeight())
        }
    }
}

@Composable
private fun SmallPosterItem(
    context: Context,
    release: WidgetReleaseItem,
    modifier: GlanceModifier = GlanceModifier
) {
    Column(
        modifier = modifier
            .clickable(actionStartActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(release.getDeepLinkUrl()))
            )),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Poster
        SmallPosterImage(context, release)
        
        Spacer(modifier = GlanceModifier.height(3.dp))
        
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
                fontSize = WidgetTheme.typography.badge,
                fontWeight = FontWeight.Medium
            ),
            maxLines = 1
        )
    }
}

@Composable
private fun SmallPosterImage(
    context: Context,
    release: WidgetReleaseItem
) {
    val posterHeight = 70.dp
    val posterWidth = 47.dp
    
    val bitmap = loadFeaturedPosterBitmap(context, release.posterFilename)
    
    Box(
        modifier = GlanceModifier
            .size(posterWidth, posterHeight)
            .background(WidgetTheme.colors.surface)
            .cornerRadius(5.dp),
        contentAlignment = Alignment.Center
    ) {
        if (bitmap != null) {
            Image(
                provider = ImageProvider(bitmap),
                contentDescription = release.title,
                modifier = GlanceModifier
                    .fillMaxSize()
                    .cornerRadius(5.dp)
            )
        } else {
            // Placeholder icon
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
private fun FeaturedEmptyState(mode: WidgetMode) {
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
private fun loadFeaturedPosterBitmap(context: Context, filename: String?): Bitmap? {
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
