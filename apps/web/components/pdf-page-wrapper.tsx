import { useEffect } from "react";
import { Page } from "react-pdf";
import { useInView } from "react-intersection-observer";

export function PdfPageWrapper({
  pageNumber,
  width,
  scale,
  onPageViewed,
}: {
  pageNumber: number;
  width?: number;
  scale: number;
  onPageViewed: (page: number) => void;
}) {
  const { ref, inView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    if (inView) onPageViewed(pageNumber);
  }, [inView, pageNumber, onPageViewed]);

  return (
    <div ref={ref}>
      <Page
        pageNumber={pageNumber}
        width={width}
        scale={scale}
        className="shadow-md shrink-0"
      />
    </div>
  );
}
