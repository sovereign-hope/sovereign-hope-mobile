package expo.modules.versehittest

import android.text.Layout
import android.text.Spanned
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
        val textView = findTextViewAt(rootView, screenX, screenY) ?: return -4

        val location = IntArray(2)
        textView.getLocationOnScreen(location)
        val localX = screenX - location[0]
        val localY = screenY - location[1]

        return getVerseFromTextView(textView, localX, localY)
    }

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

            val className = child.javaClass.name
            if (className == "com.facebook.react.views.text.PreparedLayoutTextView" ||
                className == "com.facebook.react.views.text.ReactTextView") {
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
        val fabricResult = getVerseFromFabricTextView(view, localX, localY)
        if (fabricResult > 0) return fabricResult
        return getVerseFromPaperTextView(view, localX, localY)
    }

    private fun getVerseFromFabricTextView(view: View, localX: Float, localY: Float): Int {
        val preparedLayout = try {
            val field = view.javaClass.getDeclaredField("preparedLayout")
            field.isAccessible = true
            field.get(view) ?: return -1
        } catch (_: Exception) { return -1 }

        val layout = try {
            val field = preparedLayout.javaClass.getDeclaredField("layout")
            field.isAccessible = true
            field.get(preparedLayout) as? Layout ?: return -1
        } catch (_: Exception) { return -1 }

        val verticalOffset = try {
            val field = preparedLayout.javaClass.getDeclaredField("verticalOffset")
            field.isAccessible = true
            (field.get(preparedLayout) as? Float) ?: 0f
        } catch (_: Exception) { 0f }

        val layoutX = localX - view.paddingLeft
        val layoutY = localY - (view.paddingTop + verticalOffset.roundToInt())

        if (layoutX < 0 || layoutY < 0) return -1

        val line = layout.getLineForVertical(layoutY.roundToInt())
        val charOffset = layout.getOffsetForHorizontal(line, layoutX)

        return findVerseInText(layout.text, charOffset)
    }

    private fun getVerseFromPaperTextView(view: View, localX: Float, localY: Float): Int {
        val layout = try {
            val method = view.javaClass.getMethod("getLayout")
            method.invoke(view) as? Layout ?: return -1
        } catch (_: Exception) { return -1 }

        val layoutX = localX - view.paddingLeft
        val layoutY = localY - view.paddingTop

        if (layoutX < 0 || layoutY < 0) return -1

        val line = layout.getLineForVertical(layoutY.roundToInt())
        val charOffset = layout.getOffsetForHorizontal(line, layoutX)

        return findVerseInText(layout.text, charOffset)
    }

    /**
     * Scan backward from charOffset through the text to find the nearest
     * verse number pattern: digits (optionally with ":") followed by a space,
     * at a word boundary (start of text, after newline, or after space).
     */
    private fun findVerseInText(text: CharSequence, charOffset: Int): Int {
        return try {
            findVerseInTextUnsafe(text, charOffset)
        } catch (_: Exception) {
            -10 // safety catch
        }
    }

    private fun findVerseInTextUnsafe(text: CharSequence, charOffset: Int): Int {
        val str = text.toString()
        if (charOffset < 0 || charOffset >= str.length) return -6
        val safeOffset = charOffset.coerceIn(0, str.length - 1)
        val spanned = text as? Spanned

        // First try: scan for ReactClickableSpan or similar spans that
        // represent verse-text fragments. On Android, each verse-text's
        // onPressIn creates a ClickableSpan.
        if (spanned != null) {
            // Try to find verse number via span boundaries
            try {
                val clickableClass = Class.forName("com.facebook.react.views.text.internal.span.ReactClickableSpan")
                @Suppress("UNCHECKED_CAST")
                val spans = spanned.getSpans(safeOffset, (safeOffset + 1).coerceAtMost(str.length), clickableClass as Class<Any>)
                if (spans.isNotEmpty()) {
                    val span = spans[0]
                    val spanStart = spanned.getSpanStart(span)
                    val spanEnd = spanned.getSpanEnd(span)
                    val spanText = str.substring(spanStart, spanEnd)

                    // Check if this span's text starts with digits (verse number)
                    val match = Regex("^\\s*(\\d+(?::\\d+)?)\\s").find(spanText)
                    if (match != null) {
                        val verseStr = match.groupValues[1]
                        val parts = verseStr.split(":")
                        return parts.last().toIntOrNull() ?: -1
                    }

                    // Not a verse number span — check the previous span
                    if (spanStart > 0) {
                        @Suppress("UNCHECKED_CAST")
                        val prevSpans = spanned.getSpans(spanStart - 1, spanStart, clickableClass as Class<Any>)
                        if (prevSpans.isNotEmpty()) {
                            val prevSpan = prevSpans[0]
                            val prevStart = spanned.getSpanStart(prevSpan)
                            val prevEnd = spanned.getSpanEnd(prevSpan)
                            val prevText = str.substring(prevStart, prevEnd)
                            val prevMatch = Regex("^\\s*(\\d+(?::\\d+)?)\\s").find(prevText)
                            if (prevMatch != null) {
                                val verseStr = prevMatch.groupValues[1]
                                val parts = verseStr.split(":")
                                return parts.last().toIntOrNull() ?: -1
                            }
                        }
                    }
                }
            } catch (_: Exception) {
                // Class not found — fall through to text scanning
            }
        }

        // Fallback: scan backward in plain text for verse number pattern
        var scanIndex = charOffset
        while (scanIndex >= 0) {
            val ch = str[scanIndex]
            if (ch == ' ' || ch == '\n' || ch == '\t') {
                var digitEnd = scanIndex
                var digitStart = scanIndex - 1
                while (digitStart >= 0 && str[digitStart].isDigit()) {
                    digitStart--
                }
                digitStart++

                if (digitStart < digitEnd) {
                    val numStr = str.substring(digitStart, digitEnd)
                    if (digitStart == 0 || str[digitStart - 1] == '\n' || str[digitStart - 1] == ' ') {
                        val parts = numStr.split(":")
                        val versePart = parts.last()
                        if (versePart.isNotEmpty() && versePart.length <= 3) {
                            return versePart.toIntOrNull() ?: -1
                        }
                    }
                }
            }
            scanIndex--
        }
        return -7
    }
}
