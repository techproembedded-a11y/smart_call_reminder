import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, X, AlertCircle } from 'lucide-react';

interface AudioUploaderProps {
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg'];
const MAX_SIZE_MB = 25;

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileSelected, disabled = false }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const name = file.name.toLowerCase();
    const isAllowed = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

    if (!isAllowed) {
      setError(`Unsupported format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds ${MAX_SIZE_MB}MB limit.`);
      return;
    }

    setSelectedFile(file);
    onFileSelected(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onFileSelected(null);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Upload Audio File
          </span>
        </div>
        <span className="text-xs text-slate-500">Max {MAX_SIZE_MB}MB (.mp3, .wav, .m4a, .webm)</span>
      </div>

      {error && (
        <div className="mb-2 p-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!selectedFile ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
            disabled={disabled}
            onChange={handleFileChange}
            className="hidden"
            id="audio-file-input"
          />
          <label
            htmlFor="audio-file-input"
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-blue-500 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition-colors shadow-sm ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FileAudio className="w-4 h-4 text-slate-500" />
            <span>Choose Audio File</span>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileAudio className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              {selectedFile.name}
            </span>
            <span className="text-[11px] text-slate-400 shrink-0">
              ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
