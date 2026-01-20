package {{PACKAGE_NAME}}.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.glance.appwidget.GlanceAppWidgetManager
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import {{PACKAGE_NAME}}.widget.data.LayoutStyle
import {{PACKAGE_NAME}}.widget.data.WidgetConfig
import {{PACKAGE_NAME}}.widget.data.WidgetDataProvider
import {{PACKAGE_NAME}}.widget.data.WidgetMode

/**
 * Configuration activity for Mira widgets.
 * Allows users to select display mode (recent/upcoming) and layout style (for library widget).
 * Uses a native Material Design UI.
 */
class WidgetConfigActivity : Activity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var selectedMode = WidgetMode.UPCOMING
    private var selectedLayout = LayoutStyle.LIST
    private var isLibraryWidget = false

    private val coroutineScope = MainScope()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set the result to CANCELED in case the user backs out
        setResult(RESULT_CANCELED)

        // Get the widget ID from the intent
        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        // Determine if this is for MiraWidget or MiraLibraryWidget
        isLibraryWidget = isLibraryWidgetConfig()

        // Load existing configuration
        val dataProvider = WidgetDataProvider(this)
        val existingConfig = dataProvider.getWidgetConfig(appWidgetId)
        selectedMode = existingConfig.mode
        selectedLayout = existingConfig.layoutStyle

        // Build the UI programmatically
        setContentView(createConfigLayout())
    }

    private fun isLibraryWidgetConfig(): Boolean {
        // Check if this widget ID belongs to MiraLibraryWidget
        val appWidgetManager = AppWidgetManager.getInstance(this)
        val libraryWidgetIds = appWidgetManager.getAppWidgetIds(
            android.content.ComponentName(this, MiraLibraryWidgetReceiver::class.java)
        )
        return appWidgetId in libraryWidgetIds
    }

    private fun createConfigLayout(): View {
        val padding = (16 * resources.displayMetrics.density).toInt()
        val itemPadding = (12 * resources.displayMetrics.density).toInt()

        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF24273A.toInt()) // widget_background
            setPadding(padding, padding * 2, padding, padding)

            // Title
            addView(TextView(context).apply {
                text = "Configure Widget"
                setTextColor(0xFFCAD3F5.toInt()) // widget_text
                textSize = 24f
                setPadding(0, 0, 0, padding)
            })

            // Display Mode Section
            addView(TextView(context).apply {
                text = "Display Mode"
                setTextColor(0xFFA5ADCB.toInt()) // widget_subtext
                textSize = 14f
                setPadding(0, itemPadding, 0, 4)
            })

            addView(createModeSpinner())

            // Layout Style Section (only for Library Widget)
            if (isLibraryWidget) {
                addView(TextView(context).apply {
                    text = "Layout Style"
                    setTextColor(0xFFA5ADCB.toInt()) // widget_subtext
                    textSize = 14f
                    setPadding(0, itemPadding * 2, 0, 4)
                })

                addView(createLayoutSpinner())
            }

            // Spacer
            addView(View(context).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    0,
                    1f
                )
            })

            // Buttons row
            addView(LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, padding, 0, 0)

                // Cancel button
                addView(Button(context).apply {
                    text = "Cancel"
                    setTextColor(0xFFA5ADCB.toInt())
                    setBackgroundColor(0xFF363A4F.toInt())
                    layoutParams = LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f
                    ).apply {
                        marginEnd = itemPadding / 2
                    }
                    setOnClickListener {
                        setResult(RESULT_CANCELED)
                        finish()
                    }
                })

                // Save button
                addView(Button(context).apply {
                    text = "Save"
                    setTextColor(0xFF24273A.toInt())
                    setBackgroundColor(0xFFB7BDF8.toInt()) // accent
                    layoutParams = LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f
                    ).apply {
                        marginStart = itemPadding / 2
                    }
                    setOnClickListener {
                        saveConfiguration()
                    }
                })
            })
        }
    }

    private fun createModeSpinner(): Spinner {
        val modes = listOf(
            WidgetMode.UPCOMING to "Upcoming Releases",
            WidgetMode.RECENT to "Recent Releases"
        )

        return Spinner(this).apply {
            setBackgroundColor(0xFF363A4F.toInt())
            val padding = (12 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)

            adapter = ArrayAdapter(
                context,
                android.R.layout.simple_spinner_dropdown_item,
                modes.map { it.second }
            ).apply {
                setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            }

            // Set initial selection
            setSelection(modes.indexOfFirst { it.first == selectedMode }.coerceAtLeast(0))

            onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    selectedMode = modes[position].first
                    // Update text color
                    (view as? TextView)?.setTextColor(0xFFCAD3F5.toInt())
                }

                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }
        }
    }

    private fun createLayoutSpinner(): Spinner {
        val layouts = listOf(
            LayoutStyle.LIST to "List",
            LayoutStyle.GRID to "Grid",
            LayoutStyle.FEATURED to "Featured",
            LayoutStyle.CARDS to "Cards"
        )

        return Spinner(this).apply {
            setBackgroundColor(0xFF363A4F.toInt())
            val padding = (12 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)

            adapter = ArrayAdapter(
                context,
                android.R.layout.simple_spinner_dropdown_item,
                layouts.map { it.second }
            ).apply {
                setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            }

            // Set initial selection
            setSelection(layouts.indexOfFirst { it.first == selectedLayout }.coerceAtLeast(0))

            onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    selectedLayout = layouts[position].first
                    // Update text color
                    (view as? TextView)?.setTextColor(0xFFCAD3F5.toInt())
                }

                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }
        }
    }

    private fun saveConfiguration() {
        // Save config to SharedPreferences
        val config = WidgetConfig(
            mode = selectedMode,
            layoutStyle = selectedLayout
        )

        val dataProvider = WidgetDataProvider(this)
        dataProvider.saveWidgetConfig(appWidgetId, config)

        // Trigger widget refresh
        coroutineScope.launch {
            try {
                val glanceManager = GlanceAppWidgetManager(this@WidgetConfigActivity)
                val glanceId = glanceManager.getGlanceIdBy(appWidgetId)

                // Update the widget - it will read config from SharedPreferences in provideGlance
                if (isLibraryWidget) {
                    MiraLibraryWidget().update(this@WidgetConfigActivity, glanceId)
                } else {
                    MiraWidget().update(this@WidgetConfigActivity, glanceId)
                }
            } catch (e: Exception) {
                // Log error but continue - widget will still work with default config
                e.printStackTrace()
            }

            // Return success
            val resultValue = Intent().apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            setResult(RESULT_OK, resultValue)
            finish()
        }
    }
}
