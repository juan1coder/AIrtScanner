
import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { Spinner } from './components/Spinner';
import { analyzeImageStyle, editImageWithGemini, generateCreativeTitle } from './services/geminiService';
import { AnalysisResult, GeneratedItem, STYLE_PRESETS } from './types';
// Added XIcon to imports
import { GithubIcon, MagicIcon, WandIcon, HistoryIcon, PlusIcon, DownloadIcon, XIcon } from './components/icons';

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Generation/Creator State
  const [userIdea, setUserIdea] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [customModifier, setCustomModifier] = useState('');
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedItem[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (file: File) => {
    setImageFile(file);
    setAnalysisResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeClick = useCallback(async () => {
    if (!imageUrl) {
      setError("Please upload an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const base64Data = imageUrl.split(',')[1];
      const mimeType = imageUrl.split(',')[0].split(':')[1].split(';')[0];
      
      const result = await analyzeImageStyle(base64Data, mimeType);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze. Check console.");
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl]);

  const handleGenerateClick = useCallback(async () => {
    if (!imageUrl) {
        setError("Please upload a reference image.");
        return;
    }
    if (!userIdea && selectedModifiers.length === 0) {
        setError("Please enter an idea or select styles.");
        return;
    }

    setIsGenerating(true);
    setError(null);

    try {
        const base64Data = imageUrl.split(',')[1];
        const mimeType = imageUrl.split(',')[0].split(':')[1].split(';')[0];

        // 1. Generate Image
        const generatedImgUrl = await editImageWithGemini(
            base64Data, 
            mimeType, 
            userIdea, 
            selectedModifiers
        );

        // 2. Generate Title
        const title = await generateCreativeTitle(userIdea, selectedModifiers);

        // 3. Save to History
        const newItem: GeneratedItem = {
            id: Date.now().toString(),
            imageUrl: generatedImgUrl,
            title: title,
            prompt: userIdea,
            modifiers: selectedModifiers,
            timestamp: Date.now()
        };

        setGeneratedHistory(prev => [newItem, ...prev]);

    } catch (err) {
        console.error(err);
        setError("Failed to generate image. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  }, [imageUrl, userIdea, selectedModifiers]);

  const toggleModifier = (mod: string) => {
    setSelectedModifiers(prev => 
        prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const addCustomModifier = () => {
    if(customModifier.trim() && !selectedModifiers.includes(customModifier.trim())) {
        setSelectedModifiers(prev => [...prev, customModifier.trim()]);
        setCustomModifier('');
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImageUrl(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <header className="py-4 px-6 md:px-8 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 flex items-center gap-2">
          <WandIcon className="w-6 h-6 text-purple-400" />
          Art Style Scanner <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">Nano Banana</span>
        </h1>
         <a
          href="https://github.com/google/genai-js"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="View source on GitHub"
        >
          <GithubIcon className="w-6 h-6" />
        </a>
      </header>
      
      <main className="flex-grow container mx-auto p-4 md:p-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: Creator Controls */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-lg">
                    <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <MagicIcon className="w-5 h-5 text-cyan-400" />
                        Creative Studio
                    </h2>
                    
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Your Idea</label>
                        <textarea 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-24"
                            placeholder="E.g., A futuristic city, a cat eating pizza, explosion of flowers..."
                            value={userIdea}
                            onChange={(e) => setUserIdea(e.target.value)}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Style DNA</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {STYLE_PRESETS.map(style => (
                                <button 
                                    key={style}
                                    onClick={() => toggleModifier(style)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${selectedModifiers.includes(style) 
                                        ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' 
                                        : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={customModifier}
                                onChange={(e) => setCustomModifier(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCustomModifier()}
                                placeholder="Add custom style..."
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                            />
                            <button 
                                onClick={addCustomModifier}
                                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {selectedModifiers.length > 0 && (
                             <div className="mt-3 flex flex-wrap gap-1">
                                {selectedModifiers.map(mod => (
                                    <span key={mod} className="text-xs bg-cyan-900/30 text-cyan-300 border border-cyan-900 px-2 py-1 rounded flex items-center gap-1">
                                        {mod}
                                        <button onClick={() => toggleModifier(mod)} className="hover:text-white"><XIcon className="w-3 h-3" /></button>
                                    </span>
                                ))}
                             </div>
                        )}
                    </div>

                    <button 
                        onClick={handleGenerateClick}
                        disabled={!imageUrl || isGenerating || (!userIdea && selectedModifiers.length === 0)}
                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-purple-500/20 flex justify-center items-center gap-2"
                    >
                        {isGenerating ? <Spinner /> : <><MagicIcon className="w-5 h-5" /> Nano Render</>}
                    </button>
                </div>
            </div>

            {/* RIGHT COLUMN: Visuals */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-300 font-semibold">Input Image</h3>
                        {imageUrl && !analysisResult && (
                            <button 
                                onClick={handleAnalyzeClick}
                                disabled={isLoading}
                                className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-gray-200 transition-colors"
                            >
                                {isLoading ? 'Analyzing...' : 'Detect Style Only'}
                            </button>
                        )}
                     </div>
                     
                     <ImageUploader 
                        onImageChange={handleImageChange} 
                        imageUrl={imageUrl} 
                        onReset={handleReset}
                    />

                    {error && <div className="mt-4 text-center text-red-400 bg-red-900/20 border border-red-900/50 p-3 rounded-lg text-sm">{error}</div>}
                </div>

                {/* Analysis Result Display */}
                {analysisResult && (
                    <div className="animate-fade-in">
                        <ResultDisplay result={analysisResult} />
                    </div>
                )}
                
                {/* HISTORY SECTION */}
                {generatedHistory.length > 0 && (
                    <div className="space-y-4">
                         <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                            <HistoryIcon className="w-5 h-5 text-gray-400" />
                            History Log
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {generatedHistory.map((item) => (
                                <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
                                    <div className="relative aspect-video bg-gray-900">
                                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <a href={item.imageUrl} download={`nano-render-${item.id}.png`} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm">
                                                <DownloadIcon className="w-6 h-6" />
                                            </a>
                                        </div>
                                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-xs text-cyan-300 border border-white/10">
                                            Nano Render
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300 mb-1">{item.title}</h4>
                                        <p className="text-xs text-gray-500 mb-2">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                        <p className="text-sm text-gray-300 line-clamp-2 mb-2">{item.prompt}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {item.modifiers.map(mod => (
                                                <span key={mod} className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{mod}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                )}
            </div>
        </div>
      </main>
       <footer className="text-center py-4 text-xs text-gray-600 border-t border-gray-700/50 mt-8">
        Powered by Google Gemini 2.5 Flash & Flash Image
      </footer>
    </div>
  );
};

export default App;
