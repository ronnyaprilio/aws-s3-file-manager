"use client";

import { useState, useEffect, useCallback } from "react";

type S3File = {
  key: string;
  url: string;
  size: number;
  lastModified: string;
};

export default function Home() {
  const [files, setFiles] = useState<S3File[]>([]);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("dashboard/api/files");
      const data = await res.json();

      if (data && Array.isArray(data.files)) {
        setFiles(data.files);
      } else if (Array.isArray(data)) {
        setFiles(data);
      } else {
        console.error("Unexpected API response:", data);
        setFiles([]);
        setError(data?.error || "Unexpected response from server.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setFiles([]);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Handle Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch("dashboard/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFileToUpload(null);
        // Reset the file input
        const fileInput = document.querySelector(
          'input[type="file"]'
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        await fetchFiles();
      } else {
        setError(data?.error || "Upload failed.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete "${key}"?`)) return;

    setError(null);
    try {
      const res = await fetch("dashboard/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchFiles();
      } else {
        setError(data?.error || "Delete failed.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Delete failed. Check your connection.");
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <main className="max-w-4xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8">📁 AWS S3 File Manager</h1>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-700 font-bold hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Form */}
      <form
        onSubmit={handleUpload}
        className="mb-12 flex gap-4 items-center bg-gray-100 p-6 rounded-lg dark:bg-gray-800"
      >
        <input
          type="file"
          onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
          className="border p-2 rounded w-full bg-white dark:bg-gray-700"
        />
        <button
          type="submit"
          disabled={!fileToUpload || uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {/* File List */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Files</h2>
        <button
          onClick={fetchFiles}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading files...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-500">No files found in the bucket.</p>
      ) : (
        <ul className="space-y-4">
          {files.map((file) => (
            <li
              key={file.key}
              className="flex items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col overflow-hidden mr-4">
                <span className="font-medium truncate" title={file.key}>
                  {file.key}
                </span>
                <span className="text-sm text-gray-500">
                  {formatSize(file.size)}
                  {file.lastModified &&
                    ` • ${new Date(file.lastModified).toLocaleString()}`}
                </span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm text-center"
                >
                  Download
                </a>
                <button
                  onClick={() => handleDelete(file.key)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}