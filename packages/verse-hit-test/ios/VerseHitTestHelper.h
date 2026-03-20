#import <UIKit/UIKit.h>

@interface VerseHitTestHelper : NSObject

/// Find the verse number at the given screen point by performing native
/// text-run hit testing on the React Native paragraph component.
/// Returns the verse number (1-based) or -1 if no verse was found.
+ (NSInteger)verseNumberAtScreenPoint:(CGPoint)point;

@end
