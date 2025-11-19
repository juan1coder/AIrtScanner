
import React, { useRef } from 'react';
import { UploadIcon, XIcon } from './icons';

interface ImageUploaderProps {
  onImageChange: (file: File) => void;
  imageUrl: string | null;
  onReset: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageChange, imageUrl, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageChange(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      {imageUrl ? (
        <div className="relative group w-full aspect-video md:aspect-[2/1] rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700">
          <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-contain bg-gray-800" />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={onReset}
              className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Remove image"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="w-full aspect-video md:aspect-[2/1] border-4 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-gray-800/50 transition-all duration-300"
        >
          <UploadIcon className="w-12 h-12 text-gray-500 mb-4 transition-transform group-hover:scale-110" />
          <p className="text-gray-400 font-semibold">
            <span className="text-purple-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP, etc.</p>
        </div>
      )}
    </div>
  );
};
