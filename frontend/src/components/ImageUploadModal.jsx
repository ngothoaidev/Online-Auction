import { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Check } from 'lucide-react';

export default function ImageUploadModal({ isOpen, onClose, onUpload, title = "Upload Image" }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  // HANDLING LOGIC MOVED HERE
  // Manage the global blur event internally based on visibility state
  useEffect(() => {
    const shouldBlur = isOpen;
    window.dispatchEvent(new CustomEvent('toggle-modal-blur', { detail: shouldBlur }));

    // Cleanup: Ensure blur is removed if component unmounts
    return () => {
        window.dispatchEvent(new CustomEvent('toggle-modal-blur', { detail: false }));
    };
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
        setPreview(null);
        setSelectedFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Drag Events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Manual Selection
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Process File
  const handleFile = (file) => {
    if (file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      alert("Please upload an image file.");
    }
  };

  // Submit
  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile);
      // We don't close here automatically; let the parent decide or close after success
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-bold text-lg text-[var(--text)]">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {preview ? (
            // Preview State
            <div className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg)]">
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                <button 
                    onClick={() => { setPreview(null); setSelectedFile(null); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
          ) : (
            // Upload State
            <div 
              className={`
                relative flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl transition-all duration-200
                ${dragActive 
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/10 scale-[1.02]' 
                  : 'border-[var(--border-strong)] bg-[var(--bg-soft)] hover:border-[var(--text-muted)]'
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input 
                ref={inputRef} 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleChange} 
              />
              
              <div className="p-4 rounded-full bg-[var(--bg)] shadow-sm mb-4">
                <UploadCloud size={32} className={dragActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              </div>
              
              <p className="text-sm font-medium text-[var(--text)] mb-1">
                Click or drag image here
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                PNG, JPG up to 10MB
              </p>
              
              <button 
                onClick={() => inputRef.current?.click()}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-bold bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity"
              >
                Select File
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--bg-soft)] border-t border-[var(--border)] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!selectedFile}
            className={`
                px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all
                ${selectedFile 
                    ? 'bg-[var(--accent)] text-[#1a1205] hover:brightness-110 shadow-lg shadow-[var(--accent)]/20' 
                    : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                }
            `}
          >
            <Check size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}