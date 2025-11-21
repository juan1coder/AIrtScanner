
import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { Spinner } from './components/Spinner';
import { ImageEditor } from './components/ImageEditor';
import { analyzeImageStyle, editImageWithGemini, generateCreativeTitle } from './services/geminiService';
import { AnalysisResult, GeneratedItem, STYLE_PRESETS } from './types';
import { GithubIcon, MagicIcon, WandIcon, HistoryIcon, PlusIcon, DownloadIcon, XIcon, CopyIcon, ChatBubbleIcon, TextIcon } from './components/icons';
import JSZip from 'jszip';

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
  
  // Editing State
  const [editingItem, setEditingItem] = useState<GeneratedItem | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

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
        const { imageUrl: generatedImgUrl } = await editImageWithGemini(
            base64Data, 
            mimeType, 
            userIdea, 
            selectedModifiers
        );

        // 2. Generate Title
        const title = await generateCreativeTitle(userIdea, selectedModifiers);
        
        // 3. Create style context string if analysis exists
        let styleCtx = "";
        if (analysisResult) {
             styleCtx = `A ${analysisResult.style} style image, in the style of ${analysisResult.artist}. Featuring ${analysisResult.mood.toLowerCase()} tones, with a color palette of ${analysisResult.colorPalette.join(', ')}. Key techniques include ${analysisResult.techniques.join(', ')}.`;
        }

        // 4. Save to History
        const newItem: GeneratedItem = {
            id: Date.now().toString(),
            imageUrl: generatedImgUrl,
            title: title,
            prompt: userIdea,
            modifiers: selectedModifiers,
            styleContext: styleCtx,
            timestamp: Date.now()
        };

        setGeneratedHistory(prev => [newItem, ...prev]);

    } catch (err) {
        console.error(err);
        setError("Failed to generate image. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  }, [imageUrl, userIdea, selectedModifiers, analysisResult]);

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

  const handleClearAll = () => {
      handleReset();
  }

  const generateLogText = (item: GeneratedItem) => {
      return `${item.title}
${new Date(item.timestamp).toLocaleString()}

Prompt:
${item.prompt}

Styles:
${item.modifiers.join(', ') || 'None'}

${item.styleContext ? `Original Style Context:\n${item.styleContext}` : ''}`;
  };

  const handleCopyLog = (item: GeneratedItem) => {
      const text = generateLogText(item);
      navigator.clipboard.writeText(text);
      setCopiedLogId(item.id);
      setTimeout(() => setCopiedLogId(null), 2000);
  };

  const handleDownloadLog = (item: GeneratedItem) => {
      const text = generateLogText(item);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.title.replace(/\s+/g, '-').toLowerCase()}-log.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
      if (generatedHistory.length === 0) return;
      
      const zip = new JSZip();
      const folder = zip.folder("nano-banana-logs");
      
      // Add images and logs
      for (const item of generatedHistory) {
          // Add Text Log
          const logText = generateLogText(item);
          folder?.file(`logs/${item.title.replace(/\s+/g, '_')}_${item.id}.txt`, logText);

          // Add Image (Need to fetch blob from data URL)
          try {
             const response = await fetch(item.imageUrl);
             const blob = await response.blob();
             folder?.file(`images/${item.title.replace(/\s+/g, '_')}_${item.id}.png`, blob);
          } catch (e) {
              console.error("Failed to add image to zip", e);
          }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nano_banana_history_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0b0c15] text-gray-100 font-sans flex flex-col selection:bg-purple-500/30">
      <header className="py-4 px-6 md:px-8 border-b border-gray-800 flex justify-between items-center bg-[#0b0c15]/90 backdrop-blur-md sticky top-0 z-40 shadow-md">
        <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 flex items-center gap-2">
          <WandIcon className="w-6 h-6 text-purple-400" />
          Art Style Scanner <span className="text-xs font-bold text-gray-400 bg-[#1a1c29] px-2 py-0.5 rounded border border-gray-700">Nano Banana</span>
        </h1>
         <a
          href="https://github.com/google/genai-js"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-white transition-colors"
          aria-label="View source on GitHub"
        >
          <GithubIcon className="w-6 h-6" />
        </a>
      </header>
      
      <main className="flex-grow container mx-auto p-4 md:p-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: Creator Controls */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#13141f] border border-gray-700/60 rounded-xl p-6 shadow-xl">
                    <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
                        <MagicIcon className="w-5 h-5 text-cyan-400" />
                        Creative Studio
                    </h2>
                    
                    <div className="mb-4 relative">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Your Idea</label>
                        <div className="relative">
                            <textarea 
                                className="w-full bg-[#0b0c15] border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-28 pr-8"
                                placeholder="E.g., A futuristic city, a cat eating pizza, explosion of flowers..."
                                value={userIdea}
                                onChange={(e) => setUserIdea(e.target.value)}
                            />
                            {userIdea && (
                                <button 
                                    onClick={() => setUserIdea('')}
                                    className="absolute top-2 right-2 text-gray-500 hover:text-white p-1 bg-gray-800/50 rounded-full transition-colors"
                                    title="Clear text"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Style DNA</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {STYLE_PRESETS.map(style => (
                                <button 
                                    key={style}
                                    onClick={() => toggleModifier(style)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-all duration-200 ${selectedModifiers.includes(style) 
                                        ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]' 
                                        : 'bg-[#1a1c29] border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
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
                                className="flex-1 bg-[#0b0c15] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 placeholder-gray-600"
                            />
                            <button 
                                onClick={addCustomModifier}
                                className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors border border-gray-700"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {selectedModifiers.length > 0 && (
                             <div className="mt-3 flex flex-wrap gap-1">
                                {selectedModifiers.map(mod => (
                                    <span key={mod} className="text-xs bg-cyan-900/20 text-cyan-300 border border-cyan-900/50 px-2 py-1 rounded flex items-center gap-1 font-medium">
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
                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg shadow-purple-900/20 flex justify-center items-center gap-2"
                    >
                        {isGenerating ? <Spinner /> : <><MagicIcon className="w-5 h-5" /> Nano Render</>}
                    </button>
                </div>
            </div>

            {/* RIGHT COLUMN: Visuals */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-[#13141f] rounded-xl p-6 border border-gray-700/60 shadow-xl">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-200 font-bold flex items-center gap-2">
                            Input Image
                            {imageUrl && (
                                <button onClick={handleClearAll} className="text-xs font-normal text-red-400 hover:text-red-300 border border-red-900/50 bg-red-900/10 px-2 py-0.5 rounded ml-2 transition-colors">
                                    Clear All
                                </button>
                            )}
                        </h3>
                        {imageUrl && !analysisResult && (
                            <button 
                                onClick={handleAnalyzeClick}
                                disabled={isLoading}
                                className="text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-4 py-2 rounded text-white transition-all shadow-lg shadow-cyan-900/20 tracking-wide"
                            >
                                {isLoading ? 'SCANNING...' : 'SCAN IMAGE'}
                            </button>
                        )}
                     </div>
                     
                     <ImageUploader 
                        onImageChange={handleImageChange} 
                        imageUrl={imageUrl} 
                        onReset={handleReset}
                    />

                    {error && <div className="mt-4 text-center text-red-300 bg-red-900/20 border border-red-900/50 p-3 rounded-lg text-sm font-medium">{error}</div>}
                </div>

                {/* Analysis Result Display */}
                {analysisResult && (
                    <div className="animate-fade-in">
                        <ResultDisplay result={analysisResult} />
                    </div>
                )}
                
                {/* HISTORY SECTION */}
                {generatedHistory.length > 0 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-end">
                             <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                                <HistoryIcon className="w-5 h-5 text-gray-400" />
                                History Log
                             </h3>
                             <button 
                                onClick={handleDownloadAllZip}
                                className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-900/20 border border-cyan-900/50 px-3 py-1.5 rounded transition-colors"
                             >
                                <DownloadIcon className="w-3 h-3" /> Save All (ZIP)
                             </button>
                        </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {generatedHistory.map((item) => (
                                <div key={item.id} className="bg-[#1a1c29] border border-gray-700 rounded-lg overflow-hidden group hover:border-purple-500/50 transition-all duration-300 flex flex-col shadow-lg">
                                    <div className="relative aspect-video bg-[#0b0c15]">
                                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-[#0b0c15]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                            <a href={item.imageUrl} download={`nano-render-${item.id}.png`} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10" title="Download Image">
                                                <DownloadIcon className="w-5 h-5" />
                                            </a>
                                            <button 
                                                onClick={() => setEditingItem(item)}
                                                className="p-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white shadow-lg shadow-purple-500/30"
                                                title="Chat Edit"
                                            >
                                                <ChatBubbleIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-cyan-300 border border-cyan-500/30 uppercase tracking-wide">
                                            Nano Banana
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300 truncate pr-2">{item.title}</h4>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => handleCopyLog(item)}
                                                    className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                                                    title="Copy Full Log"
                                                >
                                                    {copiedLogId === item.id ? <span className="text-[10px] text-green-400 font-bold">OK</span> : <CopyIcon className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={() => handleDownloadLog(item)}
                                                    className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                                                    title="Download Log Text"
                                                >
                                                    <TextIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-2 font-mono">{new Date(item.timestamp).toLocaleString()}</p>
                                        <p className="text-sm text-gray-400 line-clamp-2 mb-3 flex-1">{item.prompt}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {item.modifiers.map(mod => (
                                                <span key={mod} className="text-[10px] bg-[#0b0c15] text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">{mod}</span>
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

      {/* Modal Editor */}
      {editingItem && (
          <ImageEditor 
            initialItem={editingItem} 
            onClose={() => setEditingItem(null)} 
          />
      )}

       <footer className="text-center py-6 text-xs text-gray-600 border-t border-gray-800 mt-8 bg-[#0b0c15]">
        Powered by Google Gemini 2.5 Flash & Flash Image
      </footer>
    </div>
  );
};

export default App;
