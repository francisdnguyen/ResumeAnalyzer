"use client";

import { useAuth } from "@clerk/nextjs";
import { CheckCircleIcon, FileTextIcon, UploadCloudIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cn, formatFileSize } from "@/lib/utils";
import type { ResumeUploadResponse } from "@/types";

const ACCEPTED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_BYTES = 10 * 1024 * 1024;

type Status = "idle" | "uploading" | "success" | "error";

export function ResumeUpload() {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeUploadResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_MIME.has(file.type)) return "Only PDF and DOCX files are accepted.";
    if (file.size > MAX_BYTES) return "File must be under 10 MB.";
    return null;
  };

  const selectFile = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setErrorMessage(err);
      setStatus("error");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);
    setStatus("idle");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus("uploading");
    setErrorMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated.");

      const data = await api.resumes.upload(selectedFile, token);
      setResult(data);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setStatus("error");
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setStatus("idle");
    setErrorMessage(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isDropZoneClickable = status !== "uploading" && status !== "success";

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => isDropZoneClickable && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
          isDropZoneClickable && "cursor-pointer",
          isDragging
            ? "border-blue-500 bg-blue-500/5"
            : status === "success"
            ? "border-green-700 bg-green-500/5"
            : "border-gray-700 bg-gray-900 hover:border-gray-600"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) selectFile(file);
          }}
        />

        {/* Idle — no file selected */}
        {status === "idle" && !selectedFile && (
          <DropZoneIdle />
        )}

        {/* File selected, not yet uploading */}
        {status === "idle" && selectedFile && (
          <DropZoneFileReady file={selectedFile} />
        )}

        {/* Uploading */}
        {status === "uploading" && selectedFile && (
          <DropZoneUploading file={selectedFile} />
        )}

        {/* Success */}
        {status === "success" && selectedFile && (
          <DropZoneSuccess file={selectedFile} />
        )}

        {/* Error — show idle prompt again if no file */}
        {status === "error" && !selectedFile && (
          <DropZoneIdle />
        )}

        {/* Error — file was set but upload failed, keep showing file */}
        {status === "error" && selectedFile && (
          <DropZoneFileReady file={selectedFile} />
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* Extracted text preview */}
      {status === "success" && result?.preview && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">
            Extracted text preview
          </p>
          <p className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-line">
            {result.preview}
            <span className="text-gray-600">…</span>
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {(status === "idle" || status === "error") && selectedFile && (
          <>
            <button
              onClick={handleUpload}
              className="flex-1 px-4 py-2.5 bg-white text-gray-950 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Upload Resume
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {status === "uploading" && (
          <button
            disabled
            className="flex-1 px-4 py-2.5 bg-white/40 text-gray-700 text-sm font-semibold rounded-lg cursor-not-allowed"
          >
            Uploading…
          </button>
        )}

        {status === "success" && (
          <button
            onClick={reset}
            className="flex-1 px-4 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 border border-gray-700 transition-colors"
          >
            Upload another resume
          </button>
        )}
      </div>
    </div>
  );
}

function DropZoneIdle() {
  return (
    <>
      <div className="mx-auto w-11 h-11 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <UploadCloudIcon className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-white text-sm font-medium">Drop your resume here</p>
      <p className="text-gray-500 text-xs mt-1">or click to browse files</p>
      <p className="text-gray-700 text-xs mt-3">PDF or DOCX · Max 10 MB</p>
    </>
  );
}

function DropZoneFileReady({ file }: { file: File }) {
  return (
    <>
      <div className="mx-auto w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
        <FileTextIcon className="w-5 h-5 text-blue-400" />
      </div>
      <p className="text-white text-sm font-medium">{file.name}</p>
      <p className="text-gray-500 text-xs mt-1">{formatFileSize(file.size)}</p>
    </>
  );
}

function DropZoneUploading({ file }: { file: File }) {
  return (
    <>
      <div className="mx-auto w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 animate-pulse">
        <UploadCloudIcon className="w-5 h-5 text-blue-400" />
      </div>
      <p className="text-white text-sm font-medium">Uploading {file.name}…</p>
      <p className="text-gray-500 text-xs mt-1">Extracting text from your resume</p>
    </>
  );
}

function DropZoneSuccess({ file }: { file: File }) {
  return (
    <>
      <div className="mx-auto w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
        <CheckCircleIcon className="w-5 h-5 text-green-400" />
      </div>
      <p className="text-green-400 text-sm font-medium">Resume uploaded successfully</p>
      <p className="text-gray-500 text-xs mt-1">{file.name}</p>
    </>
  );
}
