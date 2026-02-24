# Missing Error Boundaries in Screens

---

status: pending
priority: P3-minor
issue_id: ARCH-001
tags:

- error-handling
- react
- user-experience

---

## Problem Statement

ReadingPlanScreen and related screens lack error boundaries, meaning a rendering error in one day item could crash the entire screen.

## Findings

**Affected Files**:

- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx`
- `src/screens/TodayScreen/TodayScreen.tsx`

### Risk Scenarios

1. Malformed reading plan data from Firestore
2. Unexpected null/undefined in nested objects
3. Date calculation edge cases
4. Memory verse with unexpected format

### Current Behavior

Any render error propagates up and crashes the screen, potentially leaving user stuck.

## Proposed Solution

Add error boundaries at screen level:

```typescript
// src/components/ErrorBoundary.tsx
class ScreenErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text>Something went wrong loading the reading plan.</Text>
          <Button onPress={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </View>
      );
    }
    return this.props.children;
  }
}
```

Wrap screens:

```typescript
export const ReadingPlanScreen = () => (
  <ScreenErrorBoundary>
    <ReadingPlanScreenContent />
  </ScreenErrorBoundary>
);
```

## Technical Details

- React error boundaries only catch errors in render, lifecycle, and constructors
- Async errors (useEffect callbacks) need try/catch handling separately
- Sentry integration already exists in the app

## Acceptance Criteria

- [ ] ErrorBoundary component created
- [ ] ReadingPlanScreen wrapped with error boundary
- [ ] TodayScreen wrapped with error boundary
- [ ] Errors logged to Sentry with context
- [ ] User-friendly fallback UI displayed
