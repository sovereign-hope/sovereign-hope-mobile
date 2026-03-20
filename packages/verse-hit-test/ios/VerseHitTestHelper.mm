#import "VerseHitTestHelper.h"
#import <React/RCTParagraphComponentView.h>

@implementation VerseHitTestHelper

+ (NSInteger)verseNumberAtScreenPoint:(CGPoint)screenPoint {
    UIWindow *window = UIApplication.sharedApplication.keyWindow;
    if (!window) return -2; // no window

    UIView *hitView = [window hitTest:screenPoint withEvent:nil];
    if (!hitView) return -3; // hitTest nil

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

    if (!paragraphView) return -4; // no paragraph view

    NSAttributedString *attrString = paragraphView.attributedText;
    if (!attrString || attrString.length == 0) return -5; // no text

    // Build NSTextStorage + NSLayoutManager + NSTextContainer matching
    // the paragraph view's content frame — same pattern as
    // RCTTextLayoutManager._textStorageAndLayoutManagerWithAttributesString
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

    // Force layout computation
    [layoutManager ensureLayoutForTextContainer:textContainer];

    // Convert screen point to text-local coordinates
    CGPoint localPoint = [paragraphView convertPoint:screenPoint fromView:nil];

    // Find character index at the point
    CGFloat fraction = 0;
    NSUInteger charIndex = [layoutManager characterIndexForPoint:localPoint
                                                inTextContainer:textContainer
                       fractionOfDistanceBetweenInsertionPoints:&fraction];

    if (charIndex == NSNotFound || charIndex >= textStorage.length) return -6; // char not found

    // Validate the hit — reject if at the very start/end with no fraction
    if (textStorage.length > 0 && fraction == 0 && charIndex == 0) {
        // Could be outside the text area — check more carefully
        CGRect firstGlyphRect = [layoutManager boundingRectForGlyphRange:NSMakeRange(0, 1) inTextContainer:textContainer];
        if (localPoint.y < CGRectGetMinY(firstGlyphRect) || localPoint.y > CGRectGetMaxY(firstGlyphRect)) {
            // Point is outside the first glyph — likely above the text
        }
    }

    // Use React Native's EventEmitter attribute to identify which verse-text
    // element the character belongs to. Each verse-text has a unique EventEmitter
    // stored as NSData. We find the range of the current EventEmitter, then
    // scan that range's text for the verse number digits at the start.
    NSString *text = textStorage.string;

    // Get the EventEmitter at the hit character
    NSRange emitterRange;
    NSData *emitter = [textStorage attribute:@"EventEmitter"
                                    atIndex:charIndex
                             effectiveRange:&emitterRange];

    if (!emitter) {
        // No EventEmitter — character is not in a pressable text run.
        // Scan backward to find the nearest character with an EventEmitter.
        NSInteger scanIndex = (NSInteger)charIndex - 1;
        while (scanIndex >= 0) {
            NSRange range;
            NSData *em = [textStorage attribute:@"EventEmitter"
                                        atIndex:(NSUInteger)scanIndex
                                 effectiveRange:&range];
            if (em) {
                emitter = em;
                emitterRange = range;
                break;
            }
            scanIndex--;
        }
    }

    if (!emitter) return -7; // no EventEmitter found

    // Extract the text within this EventEmitter's range
    NSString *rangeText = [text substringWithRange:emitterRange];

    // The verse number is typically at the start of the range as bold digits
    // followed by a space: "5 But woe unto you..." or "23:1 Then spake..."
    // Extract leading digits (handle chapter:verse format)
    NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:@"^\\s*(\\d+(?::\\d+)?)\\s"
                                                                          options:0
                                                                            error:NULL];
    NSTextCheckingResult *match = [regex firstMatchInString:rangeText
                                                    options:0
                                                      range:NSMakeRange(0, MIN(rangeText.length, 20))];

    if (!match || match.numberOfRanges < 2) {
        // The hit fragment doesn't start with digits — it's the verse text,
        // not the verse number. The verse number is in the PREVIOUS fragment
        // (the <b class="verse-num"> element). Scan backward to find it.
        if (emitterRange.location > 0) {
            NSRange prevRange;
            NSData *prevEm = [textStorage attribute:@"EventEmitter"
                                            atIndex:emitterRange.location - 1
                                     effectiveRange:&prevRange];
            if (prevEm) {
                NSString *prevText = [text substringWithRange:prevRange];
                match = [regex firstMatchInString:prevText
                                          options:0
                                            range:NSMakeRange(0, MIN(prevText.length, 20))];
                if (match && match.numberOfRanges >= 2) {
                    rangeText = prevText;
                }
            }
        }

        if (!match || match.numberOfRanges < 2) return -8;
    }

    NSString *verseStr = [rangeText substringWithRange:[match rangeAtIndex:1]];

    // For chapter:verse format (e.g. "23:1"), take the verse part
    NSArray *parts = [verseStr componentsSeparatedByString:@":"];
    NSString *versePart = parts.lastObject;

    NSCharacterSet *nonDigits = [[NSCharacterSet decimalDigitCharacterSet] invertedSet];
    versePart = [[versePart componentsSeparatedByCharactersInSet:nonDigits] componentsJoinedByString:@""];

    if (versePart.length == 0) return -9; // no digits found

    return [versePart integerValue];
}

@end
