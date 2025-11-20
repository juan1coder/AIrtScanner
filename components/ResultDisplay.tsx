
import React, { useState, useMemo } from 'react';
import { AnalysisResult, OutputFormat } from '../types';
import { CopyIcon, DownloadIcon, MagicIcon } from './icons';

interface ResultDisplayProps {
  result: AnalysisResult;
}

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block bg-gray-700 text-cyan-300 text-sm font-medium mr-2 mb-2 px-3 py-1 rounded-full border border-gray-600/50">
    {children}
  </span>
);

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('txt');
  const [copied, setCopied] = useState(false);

  const formatOutput = useMemo((): string => {
    // For TXT, we now use the rich creative prompt as the primary output
    const mainText = result.creativePrompt;

    switch (outputFormat) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'toml':
        return `style = "${result.style}"\nartist = "${result.artist}"\ncreative_prompt = """${result.creativePrompt}"""\ntechniques = [${result.techniques.map(t => `"${t}"`).join(', ')}]\ncolorPalette = [${result.colorPalette.map(c => `"${c}"`).join(', ')}]\ncomposition = [${result.composition.map(c => `"${c}"`).join(', ')}]\nmood = "${result.mood}"`;
      case 'txt':
      default:
        return `${mainText}\n\n-- Metadata --\nStyle: ${result.style}\nArtist: ${result.artist}\nTechniques: ${result.techniques.join(', ')}\nMood: ${result.mood}`;
    }
  }, [result, outputFormat]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([formatOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `art-prompt-${Date.now()}.${outputFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Analysis Result</h2>
      </div>

      {/* Creative Prompt Section - High Priority */}
      <div className="mb-8 bg-gray-900/80 rounded-lg p-5 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] relative group">
        <div className="absolute -top-3 left-4 bg-gray-800 px-2 py-0.5 rounded text-xs text-purple-300 font-bold flex items-center gap-1 border border-purple-500/30">
            <MagicIcon className="w-3 h-3" /> Generated Prompt
        </div>
        <p className="text-gray-200 text-lg leading-relaxed font-serif italic selection:bg-purple-500/30">
            "{result.creativePrompt}"
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-semibold text-gray-400 text-xs uppercase tracking-wider mb-2">Style & Artist</h3>
          <div className="flex flex-wrap gap-1">
             <Tag>{result.style}</Tag>
             <Tag>{result.artist}</Tag>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-400 text-xs uppercase tracking-wider mb-2">Mood</h3>
          <Tag>{result.mood}</Tag>
        </div>
        <div>
          <h3 className="font-semibold text-gray-400 text-xs uppercase tracking-wider mb-2">Techniques</h3>
          <div className="flex flex-wrap gap-1">
            {result.techniques.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-400 text-xs uppercase tracking-wider mb-2">Color Palette</h3>
          <div className="flex flex-wrap gap-1">
             {result.colorPalette.map(c => <Tag key={c}>{c}</Tag>)}
          </div>
        </div>
         <div className="md:col-span-2">
          <h3 className="font-semibold text-gray-400 text-xs uppercase tracking-wider mb-2">Composition</h3>
          <div className="flex flex-wrap gap-1">
            {result.composition.map(c => <Tag key={c}>{c}</Tag>)}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between mb-3">
             <h3 className="font-semibold text-gray-300">Export Data</h3>
             <div className="flex bg-gray-900 rounded-lg p-1">
                {(['txt', 'json', 'toml'] as OutputFormat[]).map(format => (
                    <button
                        key={format}
                        onClick={() => setOutputFormat(format)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${outputFormat === format ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        {format.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleCopy} className="flex-1 flex justify-center items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                <CopyIcon className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Prompt & Data'}
            </button>
            <button onClick={handleDownload} className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-lg">
                <DownloadIcon className="w-4 h-4" />
                Download File
            </button>
        </div>
        
        {outputFormat !== 'json' && (
            <div className="mt-4 text-xs text-gray-500 text-center">
                The generated file includes the creative prompt and all metadata tags.
            </div>
        )}
      </div>
    </div>
  );
};
