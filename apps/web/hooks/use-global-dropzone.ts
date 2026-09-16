import { useState, useEffect } from "react";
import { toast } from "sonner";

const SUPPORTED_EXTENSIONS = [".pdf", ".md", ".markdown"];
const SUPPORTED_MIMES = ["application/pdf", "text/markdown", "image/"];

export function useGlobalDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        if (e.dataTransfer.files.length > 1) {
          toast.error(
            "Multiple files detected. Only the first file will be processed.",
          );
        }
        const file = e.dataTransfer.files[0];

        const isSupported =
          SUPPORTED_MIMES.some((mime) => file.type.startsWith(mime)) ||
          SUPPORTED_EXTENSIONS.some((ext) =>
            file.name.toLowerCase().endsWith(ext),
          );

        if (isSupported) {
          setDroppedFile(file);
        } else {
          toast.error(
            "Unsupported file type. Please upload a PDF, Markdown, or Image file.",
          );
        }
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return { isDragging, droppedFile, setDroppedFile };
}
