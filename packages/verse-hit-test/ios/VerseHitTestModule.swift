import ExpoModulesCore

public final class VerseHitTestModule: Module {
    public func definition() -> ModuleDefinition {
        Name("VerseHitTest")

        // Must dispatch to main thread since UIView APIs are main-thread-only.
        AsyncFunction("getVerseAtPoint") { (x: Double, y: Double, promise: Promise) in
            DispatchQueue.main.async {
                let point = CGPoint(x: x, y: y)
                let verse = VerseHitTestHelper.verseNumber(atScreenPoint: point)
                promise.resolve(Int(verse))
            }
        }
    }
}
