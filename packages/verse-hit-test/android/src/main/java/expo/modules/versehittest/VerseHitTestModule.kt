package expo.modules.versehittest

import android.text.Layout
import android.text.Spanned
import android.text.style.AbsoluteSizeSpan
import android.view.View
import android.view.ViewGroup
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.roundToInt

class VerseHitTestModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("VerseHitTest")

        AsyncFunction("getVerseAtPoint") { x: Double, y: Double ->
            val activity = appContext.currentActivity ?: return@AsyncFunction -1

            var result = -1
            // View APIs must run on the UI thread
            val latch = java.util.concurrent.CountDownLatch(1)
            activity.runOnUiThread {
                result = findVerseAtScreenPoint(activity, x.toFloat(), y.toFloat())
                latch.countDown()
            }
            latch.await(100, java.util.concurrent.TimeUnit.MILLISECONDS)
            result
        }
    }

    private fun findVerseAtScreenPoint(
        activity: android.app.Activity,
        screenX: Float,
        screenY: Float
    ): Int {
        val rootView = activity.window.decorView as ViewGroup

        // Find the PreparedLayoutTextView (Fabric) at these screen coordinates
        val textView = findTextViewAt(rootView, screenX, screenY) ?: return -1

        // Convert screen coords to view-local coords
        val location = IntArray(2)
        textView.getLocationOnScreen(location)
        val localX = screenX - location[0]
        val localY = screenY - location[1]

        return getVerseFromTextView(textView, localX, localY)
    }

    /**
     * Walk the view tree depth-first to find the innermost text view
     * containing the screen point. Checks for both Fabric
     * (PreparedLayoutTextView) and Paper (ReactTextView) by class name
     * to avoid importing internal RN classes directly.
     */
    private fun findTextViewAt(
        root: ViewGroup,
        screenX: Float,
        screenY: Float
    ): View? {
        val location = IntArray(2)

        for (i in root.childCount - 1 downTo 0) {
            val child = root.getChildAt(i) ?: continue
            child.getLocationOnScreen(location)

            val inBounds = screenX >= location[0] &&
                screenX <= location[0] + child.width &&
                screenY >= location[1] &&
                screenY <= location[1] + child.height

            if (!inBounds) continue

            // Check for Fabric text view
            val className = child.javaClass.name
            if (className == "com.facebook.react.views.text.PreparedLayoutTextView") {
                return child
            }
            // Check for Paper text view (fallback)
            if (className == "com.facebook.react.views.text.ReactTextView") {
                return child
            }

            if (child is ViewGroup) {
                val found = findTextViewAt(child, screenX, screenY)
                if (found != null) return found
            }
        }
        return null
    }

    private fun getVerseFromTextView(view: View, localX: Float, localY: Float): Int {
        // Try Fabric path first (PreparedLayoutTextView)
        val fabricResult = getVerseFromFabricTextView(view, localX, localY)
        if (fabricResult > 0) return fabricResult

        // Fall back to Paper path (ReactTextView extends TextView)
        return getVerseFromPaperTextView(view, localX, localY)
    }

    /**
     * Fabric path: access PreparedLayout via reflection to get the
     * android.text.Layout and perform character-level hit testing.
     */
    private fun getVerseFromFabricTextView(
        view: View,
        localX: Float,
        localY: Float
    ): Int {
        // Get preparedLayout field
        val preparedLayout = try {
            val field = view.javaClass.getDeclaredField("preparedLayout")
            field.isAccessible = true
            field.get(view) ?: return -1
        } catch (_: Exception) {
            return -1
        }

        // Get Layout from PreparedLayout
        val layout = try {
            val field = preparedLayout.javaClass.getDeclaredField("layout")
            field.isAccessible = true
            field.get(preparedLayout) as? Layout ?: return -1
        } catch (_: Exception) {
            return -1
        }

        // Get verticalOffset
        val verticalOffset = try {
            val field = preparedLayout.javaClass.getDeclaredField("verticalOffset")
            field.isAccessible = true
            (field.get(preparedLayout) as? Float) ?: 0f
        } catch (_: Exception) {
            0f
        }

        // Convert to layout coordinates (mirrors PreparedLayoutTextView.getTextOffsetAt)
        val layoutX = localX - view.paddingLeft
        val layoutY = localY - (view.paddingTop + verticalOffset.roundToInt())

        if (layoutX < 0 || layoutY < 0) return -1

        val line = layout.getLineForVertical(layoutY.roundToInt())
        val charOffset = layout.getOffsetForHorizontal(line, layoutX)

        return findVerseNumberAtOffset(layout.text, charOffset)
    }

    /**
     * Paper path: ReactTextView extends AppCompatTextView, so we can
     * access getLayout() directly.
     */
    private fun getVerseFromPaperTextView(
        view: View,
        localX: Float,
        localY: Float
    ): Int {
        // ReactTextView extends TextView — try to call getLayout()
        val layout = try {
            val method = view.javaClass.getMethod("getLayout")
            method.invoke(view) as? Layout ?: return -1
        } catch (_: Exception) {
            return -1
        }

        val layoutX = localX - view.paddingLeft
        val layoutY = localY - view.paddingTop

        if (layoutX < 0 || layoutY < 0) return -1

        val line = layout.getLineForVertical(layoutY.roundToInt())
        val charOffset = layout.getOffsetForHorizontal(line, layoutX)

        return findVerseNumberAtOffset(layout.text, charOffset)
    }

    /**
     * Scan backward from charOffset to find the nearest verse number marker.
     * Verse numbers are rendered with a significantly smaller font size
     * (0.7x via the <sup> tag style). We detect them by checking for
     * AbsoluteSizeSpan with a smaller size than the surrounding text.
     */
    private fun findVerseNumberAtOffset(text: CharSequence, charOffset: Int): Int {
        val spanned = text as? Spanned ?: return -1

        // Get "normal" font size at the hit character
        val sizesAtHit = spanned.getSpans(charOffset, charOffset, AbsoluteSizeSpan::class.java)
        val normalSize = sizesAtHit.maxOfOrNull { it.size }?.toFloat() ?: return -1

        // Scan backward to find a verse number (smaller font size)
        var scanIndex = charOffset
        while (scanIndex >= 0) {
            val sizeSpans = spanned.getSpans(
                scanIndex, scanIndex + 1, AbsoluteSizeSpan::class.java
            )
            for (span in sizeSpans) {
                val ratio = span.size.toFloat() / normalSize
                if (ratio < 0.85f && ratio > 0.5f) {
                    // Found a verse number span — extract the digit range
                    val spanStart = spanned.getSpanStart(span)
                    val spanEnd = spanned.getSpanEnd(span)
                    val verseStr = text.substring(spanStart, spanEnd).trim()

                    // Handle "1:5" format — take last number
                    val parts = verseStr.split(":")
                    val digits = parts.last().filter { it.isDigit() }
                    return digits.toIntOrNull() ?: -1
                }
            }
            scanIndex--
        }
        return -1
    }
}
