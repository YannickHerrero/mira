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
 * Large widget cards layout (4x4).
 * Shows horizontal cards with poster and detailed info.
 * Up to 4 cards in a vertical stack.
 * Mirrors the iOS LargeWidgetCardsView design.
 */
@Composable
fun LargeCardsContent(
    context: Context,
    releases: List<WidgetReleaseItem>,
    mode: WidgetMode
) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(14.dp)
    ) {
        // Header
        CardsHeader(mode)
        
        Spacer(modifier = GlanceModifier.height(8.dp))
        
        // Content
        if (releases.isEmpty()) {
            CardsEmptyState(mode)
        } else {
            // Cards list (up to 4)
            Column(
                modifier = GlanceModifier.fillMaxWidth()
            ) {
                releases.take(4).forEachIndexed { index, release ->
                    if (index > 0) {
                        Spacer(modifier = GlanceModifier.height(8.dp))
                    }
                    
                    HorizontalCard(context, release)
                }
            }
        }
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}

@Composable
private fun CardsHeader(mode: WidgetMode) {
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
private fun HorizontalCard(
    context: Context,
    release: WidgetReleaseItem
) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .background(ColorProvider(WidgetTheme.colors.surface.copy(alpha = 0.4f)))
            .cornerRadius(10.dp)
            .padding(8.dp)
            .clickable(actionStartActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(release.getDeepLinkUrl()))
            )),
        verticalAlignment = Alignment.Top
    ) {
        // Poster
        CardPoster(context, release)
        
        Spacer(modifier = GlanceModifier.width(10.dp))
        
        // Info column
        Column(
            modifier = GlanceModifier.defaultWeight()
        ) {
            // Title
            Text(
                text = release.title,
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.text),
                    fontSize = WidgetTheme.typography.body,
                    fontWeight = FontWeight.Bold
                ),
                maxLines = 1
            )
            
            Spacer(modifier = GlanceModifier.height(2.dp))
            
            // Episode info
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
                    
                    // Episode name (if available and not too long)
                    if (episodeInfo.episodeName.isNotBlank()) {
                        Text(
                            text = " \u2022 ${episodeInfo.episodeName}",
                            style = TextStyle(
                                color = ColorProvider(WidgetTheme.colors.subtextDim),
                                fontSize = WidgetTheme.typography.small
                            ),
                            maxLines = 1
                        )
                    }
                }
            }
            
            Spacer(modifier = GlanceModifier.height(4.dp))
            
            // Date and badge row
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
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
                
                Spacer(modifier = GlanceModifier.defaultWeight())
                
                // Media type badge
                CardMediaTypeBadge(release.mediaType)
            }
        }
    }
}

@Composable
private fun CardPoster(
    context: Context,
    release: WidgetReleaseItem
) {
    val posterWidth = 45.dp
    val posterHeight = 65.dp
    
    val bitmap = loadCardPosterBitmap(context, release.posterFilename)
    
    Box(
        modifier = GlanceModifier
            .size(posterWidth, posterHeight)
            .background(ColorProvider(WidgetTheme.colors.surface))
            .cornerRadius(6.dp),
        contentAlignment = Alignment.Center
    ) {
        if (bitmap != null) {
            Image(
                provider = ImageProvider(bitmap),
                contentDescription = release.title,
                modifier = GlanceModifier
                    .fillMaxSize()
                    .cornerRadius(6.dp)
            )
        } else {
            // Placeholder icon
            Text(
                text = if (release.mediaType == MediaType.MOVIE) "\uD83C\uDFAC" else "\uD83D\uDCFA",
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.title
                )
            )
        }
    }
}

@Composable
private fun CardMediaTypeBadge(mediaType: MediaType) {
    val badgeText = when (mediaType) {
        MediaType.MOVIE -> "Movie"
        MediaType.TV -> "TV"
    }
    
    Box(
        modifier = GlanceModifier
            .background(ColorProvider(WidgetTheme.colors.accent.copy(alpha = 0.15f)))
            .cornerRadius(4.dp)
            .padding(horizontal = 5.dp, vertical = 2.dp)
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
private fun CardsEmptyState(mode: WidgetMode) {
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
private fun loadCardPosterBitmap(context: Context, filename: String?): Bitmap? {
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
