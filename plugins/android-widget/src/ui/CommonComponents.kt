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
 * Common UI components shared across widget layouts.
 */

/**
 * Header showing the widget mode (Recent/Upcoming Releases)
 */
@Composable
fun WidgetHeader(mode: WidgetMode) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = mode.displayName,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.text),
                fontSize = WidgetTheme.typography.title,
                fontWeight = FontWeight.Bold
            )
        )
    }
}

/**
 * Media type badge (Movie or TV)
 */
@Composable
fun MediaTypeBadge(mediaType: MediaType) {
    val backgroundColor = when (mediaType) {
        MediaType.MOVIE -> WidgetTheme.colors.badgeMovie
        MediaType.TV -> WidgetTheme.colors.badgeTv
    }

    Box(
        modifier = GlanceModifier
            .background(backgroundColor)
            .cornerRadius(4.dp)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            text = when (mediaType) {
                MediaType.MOVIE -> "Movie"
                MediaType.TV -> "TV"
            },
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.background),
                fontSize = WidgetTheme.typography.badge,
                fontWeight = FontWeight.Medium
            )
        )
    }
}

/**
 * Release date label
 */
@Composable
fun DateLabel(dateText: String) {
    Text(
        text = dateText,
        style = TextStyle(
            color = ColorProvider(WidgetTheme.colors.accent),
            fontSize = WidgetTheme.typography.caption,
            fontWeight = FontWeight.Medium
        )
    )
}

/**
 * Score badge
 */
@Composable
fun ScoreBadge(score: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = GlanceModifier
            .background(WidgetTheme.colors.surface)
            .cornerRadius(4.dp)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            text = score,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.warning),
                fontSize = WidgetTheme.typography.caption,
                fontWeight = FontWeight.Medium
            )
        )
    }
}

/**
 * Poster image with fallback placeholder
 */
@Composable
fun PosterImage(
    release: WidgetReleaseItem,
    modifier: GlanceModifier = GlanceModifier
) {
    val context = LocalContext.current
    val bitmap = loadPosterBitmap(context, release.posterFilename)

    if (bitmap != null) {
        Image(
            provider = ImageProvider(bitmap),
            contentDescription = release.title,
            modifier = modifier.cornerRadius(8.dp)
        )
    } else {
        // Placeholder
        Box(
            modifier = modifier
                .background(WidgetTheme.colors.surface)
                .cornerRadius(8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = release.title.take(1).uppercase(),
                style = TextStyle(
                    color = ColorProvider(WidgetTheme.colors.subtext),
                    fontSize = WidgetTheme.typography.title,
                    fontWeight = FontWeight.Bold
                )
            )
        }
    }
}

/**
 * Load poster bitmap from cached file
 */
private fun loadPosterBitmap(context: Context, filename: String?): Bitmap? {
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

/**
 * Create a deep link intent for a release
 */
fun createDeepLinkIntent(release: WidgetReleaseItem): Intent {
    return Intent(Intent.ACTION_VIEW, Uri.parse(release.getDeepLinkUrl()))
}

/**
 * Release title text
 */
@Composable
fun ReleaseTitle(
    title: String,
    maxLines: Int = 1,
    style: TextStyle = TextStyle(
        color = ColorProvider(WidgetTheme.colors.text),
        fontSize = WidgetTheme.typography.body,
        fontWeight = FontWeight.Medium
    )
) {
    Text(
        text = title,
        style = style,
        maxLines = maxLines
    )
}

/**
 * Episode info text (e.g., "S1 E5 - Episode Title")
 */
@Composable
fun EpisodeInfoText(release: WidgetReleaseItem) {
    val episodeInfo = release.episodeInfo
    if (episodeInfo != null) {
        Text(
            text = episodeInfo.formattedWithName,
            style = TextStyle(
                color = ColorProvider(WidgetTheme.colors.subtext),
                fontSize = WidgetTheme.typography.caption
            ),
            maxLines = 1
        )
    }
}
