"use client";

/**
 * @file file-picker.tsx
 * @description Drag-and-drop file selection control with click-to-browse, optional accept filter, and remove action.
 */
import React, { useState, useRef } from "react";
import { UploadSimple, File, X } from "@phosphor-icons/react";

interface FilePickerProps {
  onFileSelect: (file: File | null) => void;
  file: File | null;
  accept?: string;
  disabled?: boolean;
}

/**
 * @desc    Render a file picker handling drop, browse, and removal
 * @param   {FilePickerProps} props - Current file and callback
 * @returns {JSX.Element} The picker UI
 */
export function FilePicker({
  onFileSelect,
  file,
  accept,
  disabled,
}: FilePickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      // Basic mime type check if accept is provided (e.g., "image/*")
      if (accept) {
        const acceptRegex = new RegExp(accept.replace("*", ".*"));
        if (!acceptRegex.test(droppedFile.type)) {
          alert(`Invalid file type. Accepted: ${accept}`);
          return;
        }
      }
      onFileSelect(droppedFile);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      className={`relative w-full rounded-lg border-2 border-dashed p-6 transition-all duration-200 ease-in-out ${
        disabled
          ? "cursor-not-allowed opacity-50 bg-gray-50 border-gray-200"
          : isDragging
            ? "border-[#6247aa] bg-[#dec9e9]/20"
            : "border-[#dec9e9] hover:border-[#6247aa] hover:bg-[#f8f4fb] cursor-pointer"
      } ${file ? "border-solid border-[#6247aa] bg-[#f8f4fb]" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (!disabled && !file) {
          inputRef.current?.click();
        }
      }}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {file ? (
          <>
            <File className="size-8 text-[#6247aa]" weight="duotone" />
            <div className="flex flex-col items-center max-w-full">
              <span className="text-sm font-medium text-[#6247aa] truncate max-w-full px-4">
                {file.name}
              </span>
              <span className="text-xs text-[#6247aa]/70 mt-1">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="size-3" /> Remove File
            </button>
          </>
        ) : (
          <>
            <div className="rounded-full bg-[#dec9e9]/30 p-3">
              <UploadSimple className="size-6 text-[#6247aa]" />
            </div>
            <p className="text-sm font-medium text-[#6247aa]">
              Drag and drop your file here
            </p>
            <p className="text-xs text-[#6247aa]/70">
              or click to browse from your computer
            </p>
          </>
        )}
      </div>
    </div>
  );
}
