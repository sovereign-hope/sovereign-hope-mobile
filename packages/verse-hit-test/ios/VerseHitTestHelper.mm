#import "VerseHitTestHelper.h"
#import <React/RCTParagraphComponentView.h>

@implementation VerseHitTestHelper

+ (NSInteger)verseAtScreenPoint:(CGPoint)screenPoint {
    UIWindow *window = UIApplication.sharedApplication.keyWindow;
    if (!window) return -2;

    UIView *hitView = [window hitTest:screenPoint withEvent:nil];
    if (!hitView) return -3;

    // Walk up the view hierarchy to find a RCTParagraphComponentView
    RCTParagraphComponentView *paragraphView = nil;
    UIView *currentView = hitView;
    while (currentView) {
        if ([currentView isKindOfClass:[RCTParagraphComponentView class]]) {
            paragraphView = (RCTParagraphComponentView *)currentView;
            break;
        }
        currentView = currentView.superview;
    }

    if (!paragraphView) return -4;

    NSAttributedString *attrString = paragraphView.attributedText;
    if (!attrString || attrString.length == 0) return -5;

    // Build NSTextStorage + NSLayoutManager + NSTextContainer
    CGRect contentFrame = paragraphView.bounds;
    NSTextContainer *textContainer = [[NSTextContainer alloc] initWithSize:contentFrame.size];
    textContainer.lineFragmentPadding = 0.0;
    textContainer.lineBreakMode = NSLineBreakByClipping;
    textContainer.maximumNumberOfLines = 0;

    NSLayoutManager *layoutManager = [NSLayoutManager new];
    layoutManager.usesFontLeading = NO;
    [layoutManager addTextContainer:textContainer];

    NSTextStorage *textStorage = [[NSTextStorage alloc] initWithAttributedString:attrString];
    [textStorage addLayoutManager:layoutManager];

    [layoutManager ensureLayoutForTextContainer:textContainer];

    // Convert screen point to text-local coordinates
    CGPoint localPoint = [paragraphView convertPoint:screenPoint fromView:nil];

    // Find character index at the point
    CGFloat fraction = 0;
    NSUInteger charIndex = [layoutManager characterIndexForPoint:localPoint
                                                inTextContainer:textContainer
                       fractionOfDistanceBetweenInsertionPoints:&fraction];

    if (charIndex == NSNotFound || charIndex >= textStorage.length) return -6;

    // Find which EventEmitter fragment contains this character.
    // Then find the verse number by scanning backward through fragments.
    // Each verse in the ESV text has a verse-number fragment ("5 ") followed
    // by a text fragment ("But woe unto you..."). We need to find the
    // verse-number fragment that precedes (or contains) the hit character.

    NSString *text = textStorage.string;

    // Strategy: walk backward through EventEmitter boundaries from the hit
    // character. At each boundary, check if the fragment text starts with
    // digits (verse number). Return the first match.
    NSUInteger searchIndex = charIndex;

    while (YES) {
        NSRange emRange;
        NSData *em = [textStorage attribute:@"EventEmitter"
                                    atIndex:searchIndex
                             effectiveRange:&emRange];

        if (em) {
            NSString *fragText = [text substringWithRange:emRange];

            // Check if this fragment starts with a verse number pattern
            NSRegularExpression *regex =
                [NSRegularExpression regularExpressionWithPattern:@"^\\s*(\\d+(?::\\d+)?)\\s"
                                                         options:0
                                                           error:NULL];
            NSTextCheckingResult *match =
                [regex firstMatchInString:fragText
                                  options:0
                                    range:NSMakeRange(0, MIN(fragText.length, 20))];

            if (match && match.numberOfRanges >= 2) {
                NSString *verseStr = [fragText substringWithRange:[match rangeAtIndex:1]];
                // For "23:1" format, take the verse part after ":"
                NSArray *parts = [verseStr componentsSeparatedByString:@":"];
                NSString *versePart = parts.lastObject;
                NSCharacterSet *nonDigits = [[NSCharacterSet decimalDigitCharacterSet] invertedSet];
                versePart = [[versePart componentsSeparatedByCharactersInSet:nonDigits] componentsJoinedByString:@""];
                if (versePart.length > 0) {
                    return [versePart integerValue];
                }
            }
        }

        // Move to the previous fragment
        if (emRange.location == 0 || searchIndex == 0) break;
        searchIndex = emRange.location - 1;
    }

    // No fragment with a verse number found — try plain text scan as fallback.
    // Look backward from charIndex for a pattern like digits + space.
    NSInteger scanIndex = (NSInteger)charIndex;
    while (scanIndex >= 0) {
        unichar ch = [text characterAtIndex:(NSUInteger)scanIndex];
        if (ch == ' ' || ch == '\n' || ch == '\t') {
            // Check if the characters before this space are digits
            NSInteger digitEnd = scanIndex;
            NSInteger digitStart = scanIndex - 1;
            while (digitStart >= 0 && [[NSCharacterSet decimalDigitCharacterSet] characterIsMember:[text characterAtIndex:(NSUInteger)digitStart]]) {
                digitStart--;
            }
            digitStart++; // back to first digit

            if (digitStart < digitEnd) {
                NSString *numStr = [text substringWithRange:NSMakeRange((NSUInteger)digitStart, (NSUInteger)(digitEnd - digitStart))];
                // Only accept if preceded by start-of-string, newline, or another space
                if (digitStart == 0 || [text characterAtIndex:(NSUInteger)(digitStart - 1)] == '\n' || [text characterAtIndex:(NSUInteger)(digitStart - 1)] == ' ') {
                    NSArray *parts = [numStr componentsSeparatedByString:@":"];
                    NSString *versePart = parts.lastObject;
                    if (versePart.length > 0 && versePart.length <= 3) {
                        return [versePart integerValue];
                    }
                }
            }
        }
        scanIndex--;
    }

    return -7;
}

@end
