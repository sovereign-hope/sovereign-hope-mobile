#import <UIKit/UIKit.h>

@interface VerseHitTestHelper : NSObject

/// Find which verse contains the given screen point by performing native
/// text hit testing. Uses EventEmitter attributes to identify fragment
/// boundaries, then extracts the verse number.
/// Returns the verse number (1-based) or a negative error code.
+ (NSInteger)verseAtScreenPoint:(CGPoint)point;

@end
