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

    // Scan backward from charIndex to find the nearest verse number marker.
    // Verse numbers are rendered with a significantly smaller font size
    // (0.7x from the <sup> tag style) and are bold.
    NSString *text = textStorage.string;

    // First, get the "normal" font size (the font at the hit character)
    UIFont *hitFont = [textStorage attribute:NSFontAttributeName atIndex:charIndex effectiveRange:NULL];
    CGFloat normalFontSize = hitFont ? hitFont.pointSize : 0;

    // If we hit a verse number character directly, walk backward to find its start
    // Otherwise, scan backward to find the verse number marker

    NSInteger scanIndex = (NSInteger)charIndex;
    NSInteger verseNumber = -7; // no verse marker found in scan

    while (scanIndex >= 0) {
        UIFont *font = [textStorage attribute:NSFontAttributeName atIndex:(NSUInteger)scanIndex effectiveRange:NULL];
        if (!font) {
            scanIndex--;
            continue;
        }

        // Check if this character's font is significantly smaller than normal
        // (verse numbers use 0.7x font size via the <sup> style)
        CGFloat ratio = font.pointSize / normalFontSize;
        if (ratio < 0.85 && ratio > 0.5) {
            // This character is part of a verse number marker
            // Find the full extent of this verse number (contiguous small-font digits)
            NSInteger numStart = scanIndex;
            NSInteger numEnd = scanIndex;

            // Scan backward to start of number
            while (numStart > 0) {
                UIFont *prevFont = [textStorage attribute:NSFontAttributeName atIndex:(NSUInteger)(numStart - 1) effectiveRange:NULL];
                CGFloat prevRatio = prevFont ? prevFont.pointSize / normalFontSize : 1.0;
                if (prevRatio < 0.85 && prevRatio > 0.5) {
                    numStart--;
                } else {
                    break;
                }
            }

            // Scan forward to end of number
            while (numEnd < (NSInteger)textStorage.length - 1) {
                UIFont *nextFont = [textStorage attribute:NSFontAttributeName atIndex:(NSUInteger)(numEnd + 1) effectiveRange:NULL];
                CGFloat nextRatio = nextFont ? nextFont.pointSize / normalFontSize : 1.0;
                if (nextRatio < 0.85 && nextRatio > 0.5) {
                    numEnd++;
                } else {
                    break;
                }
            }

            // Extract the verse number text (strip whitespace)
            NSString *verseStr = [[text substringWithRange:NSMakeRange((NSUInteger)numStart, (NSUInteger)(numEnd - numStart + 1))] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

            // Remove any non-digit characters (e.g., "1:1 " → "1")
            // For chapter:verse format, take the last number
            NSArray *parts = [verseStr componentsSeparatedByString:@":"];
            NSString *versePart = parts.lastObject;
            // Strip non-digits
            NSCharacterSet *nonDigits = [[NSCharacterSet decimalDigitCharacterSet] invertedSet];
            versePart = [[versePart componentsSeparatedByCharactersInSet:nonDigits] componentsJoinedByString:@""];

            if (versePart.length > 0) {
                verseNumber = [versePart integerValue];
            }
            break;
        }

        scanIndex--;
    }

    return verseNumber;
}

@end
