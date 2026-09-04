"use client";
import { Skeleton } from "boneyard-js/react";
import { useState, useEffect } from "react";

export default function TestSkeleton() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 5000);
  }, []);

  return (
    <div className="p-8">
      <h1>Test Skeleton</h1>
      <Skeleton name="project-card" loading={loading}>
        {loading ? (
          <div style={{ minHeight: 180 }} />
        ) : (
          <div>Loaded Content</div>
        )}
      </Skeleton>
    </div>
  );
}
