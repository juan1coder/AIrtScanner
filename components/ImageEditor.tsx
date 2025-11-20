
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, GeneratedItem } from '../types';
import { SendIcon, XIcon, DownloadIcon } from './icons';
import { Spinner } from './Spinner';
import { editImageWithGemini } from '../services/geminiService';

interface ImageEditorProps {
  initialItem: GeneratedItem;
  onClose: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ initialItem, onClose }) => {
  const [currentImage, setCurrentImage] = useState<string>(initialItem.imageUrl);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat with the history item context
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: `Editing "${initialItem.title}". What would you like to change?`,
        timestamp: Date.now()
      }
    ]);
  }, [initialItem]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userPrompt = inputValue.trim();
    setInputValue('');
    setIsProcessing(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userPrompt,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
        const base64Data = currentImage.split(',')[1];
        const mimeType = currentImage.split(',')[0].split(':')[1].split(';')[0];

        // Generate new image based on current image + user prompt
        // We pass an empty array for modifiers as the user is driving the edit via conversation now
        const newImageUrl = await editImageWithGemini(base64Data, mimeType, userPrompt, []);

        setCurrentImage(newImageUrl);

        const modelMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            imageUrl: newImageUrl,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
        console.error(error);
        const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "Sorry, I couldn't generate that edit. Please try again.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl h-[90vh] bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
        >
            <XIcon className="w-6 h-6" />
        </button>

        {/* Left Panel: Chat & Controls */}
        <div className="w-full md:w-1/3 border-r border-gray-700 flex flex-col bg-gray-900/50">
            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                    Nano Editor
                </h3>
                <p className="text-xs text-gray-400 truncate">{initialItem.title}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                            msg.role === 'user' 
                                ? 'bg-purple-600 text-white rounded-tr-none' 
                                : 'bg-gray-700 text-gray-200 rounded-tl-none border border-gray-600'
                        }`}>
                            {msg.text && <p>{msg.text}</p>}
                            {msg.imageUrl && (
                                <div className="mt-2 rounded overflow-hidden border border-gray-600 cursor-pointer" onClick={() => setCurrentImage(msg.imageUrl!)}>
                                    <img src={msg.imageUrl} alt="Edit result" className="w-full h-auto" />
                                    <div className="p-1 bg-black/30 text-[10px] text-center text-gray-400">Click to set as active</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex justify-start">
                         <div className="bg-gray-700 rounded-lg p-3 rounded-tl-none flex items-center gap-2">
                            <Spinner />
                            <span className="text-xs text-gray-400">Rendering...</span>
                         </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type change (e.g. 'Add rain', 'Make it blue')..."
                        disabled={isProcessing}
                        className="w-full bg-gray-900 border border-gray-600 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white disabled:opacity-50"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isProcessing}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white transition-colors disabled:opacity-50 disabled:bg-gray-600"
                    >
                        <SendIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        {/* Right Panel: Main Preview */}
        <div className="flex-1 bg-gray-900 flex flex-col relative">
            <div className="flex-1 flex items-center justify-center p-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMUMxeiIgZmlsbD0iIzMzMyIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')]">
                 <img 
                    src={currentImage} 
                    alt="Current Edit" 
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-gray-700" 
                 />
            </div>
             <div className="absolute bottom-6 right-6 flex gap-3">
                 <a 
                    href={currentImage} 
                    download={`nano-edit-${Date.now()}.png`} 
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg shadow-lg transition-all font-medium"
                 >
                    <DownloadIcon className="w-5 h-5" /> Download
                 </a>
             </div>
        </div>

      </div>
    </div>
  );
};
