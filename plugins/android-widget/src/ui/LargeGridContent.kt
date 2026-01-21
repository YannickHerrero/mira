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
 * Large widget grid layout (4x4).
 * Shows up to 8 releases in a Netflix-style poster grid (4 columns, 2 rows).
 * Each poster shows the image with a date label below.
 * Mirrors the iOS LargeWidgetGridView design.
 */
@Composable
fun LargeGridContent(
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
        GridHeader(mode)
        
        Spacer(modifier = GlanceModifier.height(10.dp))
        
        // Content
        if (releases.isEmpty()) {
            GridEmptyState(mode)
        } else {
            PosterGrid(context, releases.take(8))
        }
        
        Spacer(modifier = GlanceModifier.defaultWeight())
    }
}

@Composable
private fun GridHeader(mode: WidgetMode) {
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
private fun PosterGrid(
    context: Context,
    releases: List<WidgetReleaseItem>
) {
    // Split releases into rows of 4
    val row1 = releases.take(4)
    val row2 = releases.drop(4).take(4)
    
    Column(
        modifier = GlanceModifier.fillMaxWidth()
    ) {
        // Row 1
        GridRow(context, row1)
        
        Spacer(modifier = GlanceModifier.height(10.dp))
        
        // Row 2 (if items exist)
        if (row2.isNotEmpty()) {
            GridRow(context, row2)
        }
    }
}

@Composable
private fun GridRow(
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
            
            PosterGridItem(
                context = context,
                release = release,
                modifier = GlanceModifier.defaultWeight()
            )
        }
        
        // Fill remaining space if row has fewer than 4 items
        repeat(4 - releases.size) {
            Spacer(modifier = GlanceModifier.width(8.dp))
            Spacer(modifier = GlanceModifier.defaultWeight())
        }
    }
}

@Composable
private fun PosterGridItem(
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
        PosterGridImage(context, release)
        
        Spacer(modifier = GlanceModifier.height(4.dp))
        
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
private fun PosterGridImage(
    context: Context,
    release: WidgetReleaseItem
) {
    val posterHeight = 90.dp
    val posterWidth = 60.dp
    
    val bitmap = loadGridPosterBitmap(context, release.posterFilename)
    
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
private fun GridEmptyState(mode: WidgetMode) {
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
private fun loadGridPosterBitmap(context: Context, filename: String?): Bitmap? {
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
