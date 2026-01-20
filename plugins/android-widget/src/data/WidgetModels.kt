package {{PACKAGE_NAME}}.widget.data

import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

/**
 * Episode information for TV show releases.
 * Matches the TypeScript WidgetEpisodeInfo interface.
 */
data class EpisodeInfo(
    val seasonNumber: Int,
    val episodeNumber: Int,
    val episodeName: String
) {
    /**
     * Formatted episode string (e.g., "S1 E5")
     */
    val formatted: String
        get() = "S$seasonNumber E$episodeNumber"

    /**
     * Full episode string with name (e.g., "S1 E5 - Episode Title")
     */
    val formattedWithName: String
        get() = if (episodeName.isNotBlank()) "$formatted - $episodeName" else formatted

    companion object {
        fun fromJson(json: JSONObject?): EpisodeInfo? {
            if (json == null) return null
            return try {
                EpisodeInfo(
                    seasonNumber = json.getInt("seasonNumber"),
                    episodeNumber = json.getInt("episodeNumber"),
                    episodeName = json.optString("episodeName", "")
                )
            } catch (e: Exception) {
                null
            }
        }
    }
}

/**
 * Media type enum matching the TypeScript type.
 */
enum class MediaType(val value: String) {
    MOVIE("movie"),
    TV("tv");

    companion object {
        fun fromString(value: String): MediaType {
            return when (value.lowercase()) {
                "movie" -> MOVIE
                "tv" -> TV
                else -> MOVIE
            }
        }
    }
}

/**
 * Release type enum matching the TypeScript type.
 */
enum class ReleaseType(val value: String) {
    MOVIE("movie"),
    EPISODE("episode");

    companion object {
        fun fromString(value: String): ReleaseType {
            return when (value.lowercase()) {
                "movie" -> MOVIE
                "episode" -> EPISODE
                else -> MOVIE
            }
        }
    }
}

/**
 * A single release item for the widget.
 * Matches the TypeScript WidgetReleaseItem interface.
 */
data class WidgetReleaseItem(
    val id: Int,
    val mediaType: MediaType,
    val title: String,
    val posterFilename: String?,
    val releaseDate: String,
    val releaseType: ReleaseType,
    val episodeInfo: EpisodeInfo?,
    val score: Float?
) {
    /**
     * Get a relative date label (e.g., "Today", "Tomorrow", "Jan 15")
     */
    fun getRelativeDateLabel(): String {
        return try {
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val date = dateFormat.parse(releaseDate.take(10)) ?: return releaseDate

            val now = Calendar.getInstance()
            now.set(Calendar.HOUR_OF_DAY, 0)
            now.set(Calendar.MINUTE, 0)
            now.set(Calendar.SECOND, 0)
            now.set(Calendar.MILLISECOND, 0)

            val releaseCalendar = Calendar.getInstance()
            releaseCalendar.time = date

            val diffDays = ((releaseCalendar.timeInMillis - now.timeInMillis) / (24 * 60 * 60 * 1000)).toInt()

            when (diffDays) {
                -1 -> "Yesterday"
                0 -> "Today"
                1 -> "Tomorrow"
                else -> {
                    val displayFormat = SimpleDateFormat("MMM d", Locale.getDefault())
                    displayFormat.format(date)
                }
            }
        } catch (e: Exception) {
            releaseDate.take(10)
        }
    }

    /**
     * Get the deep link URL for this release
     */
    fun getDeepLinkUrl(): String {
        return "mira://media/${mediaType.value}/$id"
    }

    /**
     * Get display badge text (Movie or TV)
     */
    fun getBadgeText(): String {
        return when (mediaType) {
            MediaType.MOVIE -> "Movie"
            MediaType.TV -> "TV"
        }
    }

    /**
     * Get formatted score string (e.g., "8.5")
     */
    fun getFormattedScore(): String? {
        return score?.let { String.format(Locale.US, "%.1f", it) }
    }

    companion object {
        fun fromJson(json: JSONObject): WidgetReleaseItem? {
            return try {
                WidgetReleaseItem(
                    id = json.getInt("id"),
                    mediaType = MediaType.fromString(json.getString("mediaType")),
                    title = json.getString("title"),
                    posterFilename = json.optString("posterFilename", null),
                    releaseDate = json.getString("releaseDate"),
                    releaseType = ReleaseType.fromString(json.getString("releaseType")),
                    episodeInfo = EpisodeInfo.fromJson(json.optJSONObject("episodeInfo")),
                    score = if (json.has("score") && !json.isNull("score")) json.getDouble("score").toFloat() else null
                )
            } catch (e: Exception) {
                null
            }
        }
    }
}

/**
 * Display mode for the widget.
 */
enum class WidgetMode(val value: String) {
    RECENT("recent"),
    UPCOMING("upcoming");

    companion object {
        fun fromString(value: String): WidgetMode {
            return when (value.lowercase()) {
                "recent" -> RECENT
                "upcoming" -> UPCOMING
                else -> UPCOMING
            }
        }
    }

    val displayName: String
        get() = when (this) {
            RECENT -> "Recent Releases"
            UPCOMING -> "Upcoming Releases"
        }
}

/**
 * Layout style for MiraLibraryWidget.
 */
enum class LayoutStyle(val value: String) {
    LIST("list"),
    GRID("grid"),
    FEATURED("featured"),
    CARDS("cards");

    companion object {
        fun fromString(value: String): LayoutStyle {
            return when (value.lowercase()) {
                "list" -> LIST
                "grid" -> GRID
                "featured" -> FEATURED
                "cards" -> CARDS
                else -> LIST
            }
        }
    }

    val displayName: String
        get() = when (this) {
            LIST -> "List"
            GRID -> "Grid"
            FEATURED -> "Featured"
            CARDS -> "Cards"
        }
}

/**
 * Widget data container.
 * Matches the TypeScript WidgetData interface.
 */
data class WidgetData(
    val releases: List<WidgetReleaseItem>,
    val mode: WidgetMode,
    val lastUpdated: String
) {
    /**
     * Check if the data is stale (older than 1 hour)
     */
    fun isStale(): Boolean {
        return try {
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")
            val updateTime = dateFormat.parse(lastUpdated) ?: return true
            val ageMillis = System.currentTimeMillis() - updateTime.time
            ageMillis > 60 * 60 * 1000 // 1 hour
        } catch (e: Exception) {
            true
        }
    }

    companion object {
        fun fromJson(jsonString: String): WidgetData? {
            return try {
                val json = JSONObject(jsonString)
                val releasesArray = json.getJSONArray("releases")
                val releases = mutableListOf<WidgetReleaseItem>()

                for (i in 0 until releasesArray.length()) {
                    val releaseJson = releasesArray.getJSONObject(i)
                    WidgetReleaseItem.fromJson(releaseJson)?.let { releases.add(it) }
                }

                WidgetData(
                    releases = releases,
                    mode = WidgetMode.fromString(json.getString("mode")),
                    lastUpdated = json.getString("lastUpdated")
                )
            } catch (e: Exception) {
                null
            }
        }

        /**
         * Create empty widget data
         */
        fun empty(mode: WidgetMode = WidgetMode.UPCOMING): WidgetData {
            return WidgetData(
                releases = emptyList(),
                mode = mode,
                lastUpdated = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date())
            )
        }
    }
}

/**
 * Widget configuration for a specific widget instance.
 */
data class WidgetConfig(
    val mode: WidgetMode = WidgetMode.UPCOMING,
    val layoutStyle: LayoutStyle = LayoutStyle.LIST
) {
    fun toJson(): String {
        return JSONObject().apply {
            put("mode", mode.value)
            put("layout", layoutStyle.value)
        }.toString()
    }

    companion object {
        fun fromJson(jsonString: String?): WidgetConfig {
            if (jsonString == null) return WidgetConfig()
            return try {
                val json = JSONObject(jsonString)
                WidgetConfig(
                    mode = WidgetMode.fromString(json.optString("mode", "upcoming")),
                    layoutStyle = LayoutStyle.fromString(json.optString("layout", "list"))
                )
            } catch (e: Exception) {
                WidgetConfig()
            }
        }
    }
}
