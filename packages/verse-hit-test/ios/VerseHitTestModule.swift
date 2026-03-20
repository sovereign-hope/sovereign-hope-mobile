import ExpoModulesCore

public final class VerseHitTestModule: Module {
    public func definition() -> ModuleDefinition {
        Name("VerseHitTest")

        // Synchronous function for maximum speed during drag (~60fps).
        // All work is in-memory (view traversal + text layout), no I/O.
        // Must dispatch to main thread since UIView APIs are main-thread-only.
        // TEMPORARY: return -999 to verify module is loaded and called
        AsyncFunction("getVerseAtPoint") { (x: Double, y: Double) -> Int in
            return -999
        }
    }
}
