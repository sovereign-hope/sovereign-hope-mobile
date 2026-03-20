import ExpoModulesCore

public final class VerseHitTestModule: Module {
    public func definition() -> ModuleDefinition {
        Name("VerseHitTest")

        AsyncFunction("getVerseAtPoint") { (x: Double, y: Double, promise: Promise) in
            DispatchQueue.main.async {
                let point = CGPoint(x: x, y: y)
                let verse = VerseHitTestHelper.verse(atScreenPoint: point)
                promise.resolve(Int(verse))
            }
        }
    }
}
