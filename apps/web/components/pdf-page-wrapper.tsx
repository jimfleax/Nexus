import { useEffect, useState, useRef } from "react";
import { Page } from "react-pdf";
import { useInView } from "react-intersection-observer";

export function PdfPageWrapper({
  pageNumber,
  width,
  scale,
  onPageViewed,
  isInitialPage,
}: {
  pageNumber: number;
  width?: number;
  scale: number;
  onPageViewed: (page: number) => void;
  isInitialPage?: boolean;
}) {
  const [isRendered, setIsRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: inViewRef, inView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    if (inView && isRendered) onPageViewed(pageNumber);
  }, [inView, isRendered, pageNumber, onPageViewed]);

  return (
    <div
      ref={(node) => {
        // Assign to our local ref for scrolling
        containerRef.current = node;
        // Assign to intersection observer's callback ref
        inViewRef(node);
      }}
    >
      <Page
        pageNumber={pageNumber}
        width={width}
        scale={scale}
        className="shadow-md shrink-0"
        onLoadSuccess={() => {
          setIsRendered(true);
          if (isInitialPage && containerRef.current) {
            containerRef.current.scrollIntoView({
              behavior: "instant",
              block: "start",
            });
          }
        }}
      />
    </div>
  );
}
