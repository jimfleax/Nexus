# Research Report: PDF and Web Reading Progress Tracking Architecture

This document outlines architectural best practices and efficient methodologies for tracking user reading progress, time spent, and annotations in web applications, specifically focusing on the `react-pdf` library.

## 1. Tracking Page Numbers and Scroll Position

### The Intersection Observer Approach
For tracking the current reading position in a PDF, avoid using traditional `scroll` event listeners. Scroll events fire at a high frequency on the main thread and can cause UI jank, especially when combined with heavy rendering libraries like `react-pdf` ([MDN Web Docs: Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)).

**Best Practice:**
Wrap each `<Page />` component from `react-pdf` in a container that registers an `IntersectionObserver`. 

```javascript
import { Page } from 'react-pdf';
import { useInView } from 'react-intersection-observer';

function PDFPage({ pageNumber, onPageViewed }) {
  // Triggers when 50% of the page is visible
  const { ref, inView } = useInView({ threshold: 0.5 }); 

  useEffect(() => {
    if (inView) onPageViewed(pageNumber);
  }, [inView, pageNumber, onPageViewed]);

  return (
    <div ref={ref}>
      <Page pageNumber={pageNumber} />
    </div>
  );
}
```

To calculate an overall "reading progress" percentage, track the `maxPageReached` rather than just the `currentPage`. The progress is `(maxPageReached / totalPages) * 100`.

## 2. Tracking Time Spent Reading
Because standard PDF libraries do not inherently track time, you must implement a custom timer layer.

1.  **Viewport Timing**: Start a timer (`Date.now()`) when a page or specific section becomes visible via Intersection Observer, and calculate the elapsed time when it exits the viewport.
2.  **Idle Detection**: Users frequently leave tabs open while not actively reading. Use `setTimeout` (reset by mouse movement or keypresses) to pause the reading timer after a period of inactivity.
3.  **Lifecycle Hooks**: Ensure you bind to the `visibilitychange` event (Page Visibility API) and `beforeunload` to flush and save the final time chunks when a user switches tabs or closes the browser ([MDN Web Docs: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)).

## 3. Handling Annotations and Highlights
`react-pdf` provides foundational PDF rendering but lacks built-in interactive highlight tracking. 
*   **Libraries:** Use a specialized wrapper like `react-pdf-highlighter` or `react-pdf-highlighter-extended`. These libraries handle the complex mapping of DOM coordinates to PDF-native coordinates.
*   **Coordinate Persistence:** PDF layouts scale with screen size. These libraries abstract the selections into viewport-independent metrics, meaning a highlight made on a mobile device will correctly render in the exact same spot on a desktop monitor.

## 4. Storage and Persistence Architecture

To balance real-time user feedback with database integrity, a hybrid storage approach is standard practice.

### The Hybrid Sync Strategy
1.  **Immediate Local Storage (`localStorage`)**: Every time a user changes a page or reaches a time increment, immediately update `localStorage`. This ensures data resilience against network drops or sudden tab closures.
2.  **Debounced API Synchronization**: Never send API requests on every scroll or page change. Wrap the API sync function in a `debounce` or `throttle` utility (e.g., triggering 2–3 seconds after the user stops scrolling).

```javascript
import { debounce } from 'lodash';

const syncProgressToBackend = async (progressData) => {
  localStorage.setItem('doc_progress', JSON.stringify(progressData));
  await fetch('/api/progress', { method: 'POST', body: JSON.stringify(progressData) });
};

// Only fires 2 seconds after the user stops changing pages/scrolling
const debouncedSync = debounce(syncProgressToBackend, 2000); 
```

### Backend Data Structure
The backend should implement an atomic **Upsert** (Update or Insert) operation to prevent duplicate records. A typical document structure in a NoSQL (or JSON column) database looks like this:

```json
{
  "userId": "user_123",
  "documentId": "doc_abc",
  "progress": {
    "percentage": 45.5,
    "maxPageReached": 12,
    "currentPage": 10
  },
  "metrics": {
    "timeSpentSeconds": 1340,
    "lastReadAt": "2026-09-17T22:04:00Z"
  },
  "annotations": [
    { "id": "h1", "page": 4, "rects": [{...}], "content": "Highlighted text" }
  ]
}
```

### Summary
By combining `IntersectionObserver` for performant viewport tracking, `react-pdf-highlighter` for viewport-independent annotations, and a debounced `localStorage`-first syncing strategy, you can build a highly performant and resilient reading tracking system.
