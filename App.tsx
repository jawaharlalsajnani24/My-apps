import React, { useState, useCallback, useMemo } from 'react';
import { BackgroundOption } from './types';
import { processImage } from './services/geminiService';

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- SVG Icons (defined outside components to prevent re-creation) ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21 21H3" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

// --- UI Components (defined outside the main App component) ---

const Header: React.FC = () => (
  <header className="w-full text-center">
    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary py-2">
      Jawahar Photo Editor
    </h1>
    <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">
      Transform your photos into professional portraits with a single click.
    </p>
  </header>
);

const LoadingSpinner: React.FC = () => (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
    <div className="w-16 h-16 border-4 border-slate-300 border-t-brand-primary rounded-full animate-spin"></div>
    <p className="text-white text-lg mt-4">Enhancing your photo, please wait...</p>
  </div>
);

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  previewUrl: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, previewUrl }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e: React.DragEvent<HTMLLabelElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    handleDrag(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label
        onDragEnter={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDragOver={(e) => handleDrag(e, true)}
        onDrop={handleDrop}
        htmlFor="image-upload"
        className={`flex justify-center items-center w-full h-64 px-6 transition-all duration-300 border-2 border-dashed rounded-xl cursor-pointer
          ${isDragging ? 'border-brand-primary bg-sky-100 dark:bg-sky-900/50' : 'border-gray-300 dark:border-gray-600 hover:border-brand-primary hover:bg-slate-50 dark:hover:bg-gray-700'}`}
      >
        <div className="text-center">
          {previewUrl ? (
            <img src={previewUrl} alt="Upload preview" className="max-h-56 object-contain rounded-md" />
          ) : (
            <>
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="text-brand-primary">Click to upload</span> or drag and drop
              </h3>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
            </>
          )}
        </div>
      </label>
      <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleChange} />
    </div>
  );
};

interface OptionsSelectorProps {
  selectedOption: BackgroundOption;
  onOptionChange: (option: BackgroundOption) => void;
}

const OptionsSelector: React.FC<OptionsSelectorProps> = ({ selectedOption, onOptionChange }) => (
  <fieldset className="w-full">
    <legend className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">Background Style</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* FIX: Correctly iterate over enum values to fix TypeScript error and runtime bug. */}
      {Object.values(BackgroundOption).map((option) => {
        const isSelected = selectedOption === option;
        return (
          <label key={option} htmlFor={option} className={`relative flex cursor-pointer rounded-lg border p-4 transition-all duration-200 focus:outline-none ${isSelected ? 'border-brand-primary bg-sky-50 dark:bg-sky-900/30 ring-2 ring-brand-primary' : 'border-gray-300 dark:border-gray-600'}`}>
            <input type="radio" name="background-option" id={option} value={option} checked={isSelected} onChange={() => onOptionChange(option)} className="sr-only" />
            <div className="flex flex-1">
              <div className="flex flex-col">
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{option === BackgroundOption.ORIGINAL ? 'Keep Original' : 'Clean White'}</span>
                <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">
                  {option === BackgroundOption.ORIGINAL ? 'Enhance photo with original background.' : 'Replace background with natural white lighting.'}
                </span>
              </div>
            </div>
          </label>
        );
      })}
    </div>
  </fieldset>
);

interface ImageDisplayProps {
  originalUrl: string | null;
  processedUrl: string | null;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ originalUrl, processedUrl }) => {
  const renderImageContainer = (url: string | null, title: string, isProcessed: boolean) => (
    <div className="flex flex-col items-center">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="w-full aspect-square rounded-xl bg-slate-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
        {url ? (
          <img src={url} alt={title} className="w-full h-full object-contain" />
        ) : (
          <p className="text-slate-500">
            {isProcessed ? 'Your enhanced photo will appear here' : 'Upload a photo to start'}
          </p>
        )}
      </div>
      {url && isProcessed && (
        <a
          href={url}
          download="jawahar-edited-photo.png"
          className="mt-4 inline-flex items-center gap-2 px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
        >
          <DownloadIcon className="h-5 w-5" />
          Download
        </a>
      )}
    </div>
  );

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
      {renderImageContainer(originalUrl, 'Original Photo', false)}
      {renderImageContainer(processedUrl, 'Professional Photo', true)}
    </div>
  );
};


// --- Main App Component ---

const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [backgroundOption, setBackgroundOption] = useState<BackgroundOption>(BackgroundOption.WHITE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    setUploadedFile(file);
    setProcessedImageUrl(null);
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };
  
  const handleProcessImage = useCallback(async () => {
    if (!uploadedFile) {
      setError("Please upload an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessedImageUrl(null);

    try {
      const { base64, mimeType } = await fileToBase64(uploadedFile);

      const prompt = backgroundOption === BackgroundOption.WHITE
        ? "Enhance this photo to be a clean, modern, professional, realistic headshot. Replace the background with a clean, plain white background with natural, soft studio lighting."
        : "Enhance this photo to be a clean, modern, professional, realistic headshot with great natural lighting. Keep the original background but make it look more polished, slightly blurred, and high-quality, as if taken by a professional photographer.";
      
      const resultBase64 = await processImage(base64, mimeType, prompt);
      
      const newImageUrl = `data:image/png;base64,${resultBase64}`;
      setProcessedImageUrl(newImageUrl);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [uploadedFile, backgroundOption]);

  const canProcess = useMemo(() => uploadedFile && !isLoading, [uploadedFile, isLoading]);

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 flex flex-col items-center p-4 sm:p-8">
      {isLoading && <LoadingSpinner />}
      <div className="w-full max-w-5xl space-y-8">
        <Header />
        <main className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <ImageUploader onImageUpload={handleImageUpload} previewUrl={previewUrl} />
            <div className="space-y-6">
              <OptionsSelector selectedOption={backgroundOption} onOptionChange={setBackgroundOption} />
              <button
                onClick={handleProcessImage}
                disabled={!canProcess}
                className="w-full px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Enhance My Photo'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <ImageDisplay originalUrl={previewUrl} processedUrl={processedImageUrl} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
