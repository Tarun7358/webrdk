import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  UploadCloud,
  File,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
  DollarSign,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const UploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'UNLISTED' | 'PAID'>('PUBLIC');
  const [price, setPrice] = useState<number>(49);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('visibility', visibility);
    formData.append('price', visibility === 'PAID' ? String(price) : '0.0');

    try {
      setUploadProgress(65);
      const res = await api.uploadFile(formData);
      setUploadProgress(100);
      setUploadSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-rage-accent" />
          <span>Upload Station</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Stream files directly to Google Drive storage with automated checksum verification and monetization tags.
        </p>
      </div>

      {uploadSuccess ? (
        <div className="glass-panel p-8 rounded-3xl border border-emerald-500/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Upload Dispatched Successfully!</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Your file <strong className="text-white">{uploadSuccess.name}</strong> ({(uploadSuccess.size / (1024 * 1024)).toFixed(2)} MB) is now stored and ready for distribution.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setUploadSuccess(null);
                setSelectedFile(null);
              }}
              className="px-5 py-2.5 bg-dark-card border border-dark-border text-gray-300 text-xs font-semibold rounded-xl hover:bg-dark-border"
            >
              Upload Another
            </button>
            <button
              onClick={() => navigate('/files')}
              className="px-5 py-2.5 bg-rage-accent hover:bg-rage-600 text-white text-xs font-bold rounded-xl shadow-rage-glow-sm"
            >
              Manage in File List
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpload} className="space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-rage-accent bg-rage-accent/5'
                : 'border-dark-border hover:border-rage-accent/60 bg-dark-surface/40 hover:bg-dark-surface/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <File className="w-12 h-12 text-rage-accent mx-auto" />
                <div className="font-bold text-white text-base">{selectedFile.name}</div>
                <div className="text-xs text-gray-400 font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Binary'}
                </div>
                <p className="text-[11px] text-gray-500">Click to choose a different file</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto text-gray-400">
                  <UploadCloud className="w-7 h-7 text-rage-400" />
                </div>
                <div>
                  <span className="text-white font-semibold text-sm">Drag and drop file here, or </span>
                  <span className="text-rage-400 font-bold text-sm hover:underline">browse</span>
                </div>
                <p className="text-xs text-gray-500">
                  Supports Games, Videos, ZIP, RAR, PDF, Software (Up to 1 GB)
                </p>
              </div>
            )}
          </div>

          {/* Visibility & Monetization Settings */}
          <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
            <h3 className="font-semibold text-sm text-gray-200">Visibility & Monetization Model</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'PUBLIC', label: 'Public Link', desc: 'Ad monetized download page', icon: Globe },
                { id: 'PAID', label: 'Paid Content', desc: 'Pay-per-download gate', icon: DollarSign },
                { id: 'UNLISTED', label: 'Unlisted', desc: 'Direct link only', icon: ShieldCheck },
                { id: 'PRIVATE', label: 'Private', desc: 'Owner / Team only', icon: Lock },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = visibility === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setVisibility(item.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-rage-accent bg-rage-accent/10 shadow-rage-glow-sm'
                        : 'border-dark-border bg-dark-bg/60 hover:bg-dark-card'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-rage-accent' : 'text-gray-400'}`} />
                    <div className="font-bold text-xs text-white">{item.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{item.desc}</div>
                  </button>
                );
              })}
            </div>

            {visibility === 'PAID' && (
              <div className="pt-3 border-t border-dark-border/60 flex items-center gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Content Price (INR ₹)
                  </label>
                  <div className="relative w-40">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-rage-accent font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-400 max-w-sm mt-3">
                  Users must complete payment before downloading. You receive 60% credited automatically to your wallet.
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Streaming chunk to Google Drive storage...</span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-dark-surface rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-600 to-rage-accent h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full py-3.5 bg-rage-accent hover:bg-rage-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-all shadow-rage-glow-sm flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Upload...</span>
              </div>
            ) : (
              <>
                <span>Confirm & Upload File</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
