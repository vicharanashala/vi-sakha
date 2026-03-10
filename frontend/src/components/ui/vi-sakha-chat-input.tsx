import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ArrowUp, X, FileText, Loader2, Archive, Ticket } from "lucide-react";

/* --- UTILS --- */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/* --- FILE PREVIEW --- */
interface AttachedFile {
  id: string;
  file: File;
  type: string;
  preview: string | null;
  uploadStatus: string;
}

const FilePreviewCard: React.FC<{ file: AttachedFile; onRemove: (id: string) => void }> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/") && file.preview;
  return (
    <div className="relative group flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 transition-all hover:border-gray-400">
      {isImage ? (
        <div className="w-full h-full relative">
          <img src={file.preview!} alt={file.file.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-full p-3 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-200 rounded">
              <FileText className="w-4 h-4 text-gray-500" />
            </div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate">
              {file.file.name.split('.').pop()}
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-700 truncate" title={file.file.name}>{file.file.name}</p>
            <p className="text-[10px] text-gray-400">{formatFileSize(file.file.size)}</p>
          </div>
        </div>
      )}
      <button onClick={() => onRemove(file.id)} className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="w-3 h-3" />
      </button>
      {file.uploadStatus === 'uploading' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}
    </div>
  );
};

/* --- MAIN CHAT INPUT --- */
interface ViSakhaChatInputProps {
  onSendMessage: (data: { message: string; files: AttachedFile[] }) => void;
  onRaiseTicket?: () => void;
}

export const ViSakhaChatInput: React.FC<ViSakhaChatInputProps> = ({ onSendMessage, onRaiseTicket }) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 384) + "px";
    }
  }, [message]);

  const handleFiles = useCallback((newFilesList: FileList | File[]) => {
    const newFiles = Array.from(newFilesList).map(file => {
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: isImage ? 'image/unknown' : (file.type || 'application/octet-stream'),
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadStatus: 'pending',
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      setTimeout(() => {
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, uploadStatus: 'complete' } : p));
      }, 800 + Math.random() * 1000);
    });
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFiles(pastedFiles);
    }
  };

  const handleSend = () => {
    if (!message.trim() && files.length === 0) return;
    onSendMessage({ message, files });
    setMessage("");
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const hasContent = message.trim() || files.length > 0;

  return (
    <div className="relative w-full max-w-2xl mx-auto transition-all duration-300" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div className="flex flex-col items-stretch transition-all duration-200 relative z-10 rounded-2xl cursor-text border border-gray-200 shadow-[0_0_15px_rgba(0,0,0,0.08)] hover:shadow-[0_0_20px_rgba(0,0,0,0.12)] focus-within:shadow-[0_0_25px_rgba(0,0,0,0.15)] bg-white">
        <div className="flex flex-col px-3 pt-3 pb-2 gap-2">
          {/* File Previews */}
          {files.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 px-1">
              {files.map(file => (
                <FilePreviewCard key={file.id} file={file} onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))} />
              ))}
            </div>
          )}

          {/* Text Input */}
          <div className="relative mb-1">
            <div className="max-h-96 w-full overflow-y-auto min-h-[2.5rem] pl-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="Ask Vi-Sakha anything about VInternship..."
                className="w-full bg-transparent border-0 outline-none text-gray-900 text-[16px] placeholder:text-gray-400 resize-none overflow-hidden py-0 leading-relaxed block font-normal antialiased"
                rows={1}
                autoFocus
                style={{ minHeight: '1.5em' }}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex gap-2 w-full items-center">
            <div className="flex-1 flex items-center gap-1">
              {/* Attach */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95"
                type="button"
                aria-label="Attach file"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Raise Ticket */}
              <button
                onClick={onRaiseTicket}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg transition-colors text-gray-400 hover:text-amber-700 hover:bg-amber-50 active:scale-95 text-xs font-medium"
                type="button"
              >
                <Ticket className="w-4 h-4" />
                <span className="hidden sm:inline">Raise Ticket</span>
              </button>
            </div>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!hasContent}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-xl transition-colors active:scale-95 ${hasContent ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-md' : 'bg-gray-200 text-gray-400 cursor-default'}`}
              type="button"
              aria-label="Send message"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-2xl z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <Archive className="w-10 h-10 text-blue-500 mb-2 animate-bounce" />
          <p className="text-blue-600 font-medium">Drop files to upload</p>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} />

      <div className="text-center mt-3">
        <p className="text-xs text-gray-400">Vi-Sakha may make mistakes. Always verify important information.</p>
      </div>
    </div>
  );
};

export default ViSakhaChatInput;
