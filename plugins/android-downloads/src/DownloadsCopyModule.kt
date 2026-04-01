package {{PACKAGE_NAME}}.downloads

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream

/**
 * Native module that copies a file to Android's public Downloads folder
 * using MediaStore. This avoids loading the entire file into memory,
 * which is critical for large video files (2GB+).
 */
class DownloadsCopyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "MiraDownloadsCopy"
        private const val BUFFER_SIZE = 8 * 1024 * 1024 // 8MB buffer
    }

    override fun getName(): String = NAME

    /**
     * Copy a file to the public Downloads folder using MediaStore.
     *
     * @param sourcePath Absolute path to the source file (app-private directory)
     * @param fileName Desired filename in the Downloads folder
     * @param mimeType MIME type of the file (e.g., "video/mp4")
     * @param deleteSource Whether to delete the source file after successful copy
     */
    @ReactMethod
    fun copyToDownloads(sourcePath: String, fileName: String, mimeType: String, deleteSource: Boolean, promise: Promise) {
        try {
            val sourceFile = File(sourcePath.removePrefix("file://"))
            if (!sourceFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Source file does not exist: $sourcePath")
                return
            }

            val resolver = reactApplicationContext.contentResolver

            val contentValues = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, mimeType)
                put(MediaStore.Downloads.IS_PENDING, 1)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
            }

            val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            } else {
                MediaStore.Downloads.EXTERNAL_CONTENT_URI
            }

            val uri: Uri = resolver.insert(collection, contentValues)
                ?: run {
                    promise.reject("INSERT_FAILED", "Failed to create MediaStore entry")
                    return
                }

            // Stream copy with buffered I/O — never loads the whole file into memory
            try {
                resolver.openOutputStream(uri)?.use { outputStream ->
                    FileInputStream(sourceFile).use { inputStream ->
                        val buffer = ByteArray(BUFFER_SIZE)
                        var bytesRead: Int
                        while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                            outputStream.write(buffer, 0, bytesRead)
                        }
                        outputStream.flush()
                    }
                } ?: run {
                    resolver.delete(uri, null, null)
                    promise.reject("STREAM_FAILED", "Failed to open output stream")
                    return
                }

                // Mark as complete
                val updateValues = ContentValues().apply {
                    put(MediaStore.Downloads.IS_PENDING, 0)
                }
                resolver.update(uri, updateValues, null, null)

                // Delete source file if requested
                if (deleteSource) {
                    sourceFile.delete()
                }

                promise.resolve(uri.toString())
            } catch (e: Exception) {
                // Clean up the MediaStore entry on failure
                resolver.delete(uri, null, null)
                throw e
            }
        } catch (e: Exception) {
            promise.reject("COPY_FAILED", "Failed to copy file to Downloads: ${e.message}", e)
        }
    }
}
