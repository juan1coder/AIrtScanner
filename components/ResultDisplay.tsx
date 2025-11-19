
import React, { useState, useMemo } from 'react';
import { AnalysisResult, OutputFormat } from '../types';
import { CopyIcon, DownloadIcon } from './icons';

interface ResultDisplayProps {
  result: AnalysisResult;
}

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block bg-gray-700 text-cyan-300 text-sm font-medium mr-2 mb-2 px-3 py-1 rounded-full">
    {children}
  </span>
);

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('txt');
  const [copied, setCopied] = useState(false);

  const formatOutput = useMemo((): string => {
    const plainText = `Style: ${result.style}\nArtist: ${result.artist}\nTechniques: ${result.techniques.join(', ')}\nColor Palette: ${result.colorPalette.join(', ')}\nComposition: ${result.composition.join(', ')}\nMood: ${result.mood}`;

    switch (outputFormat) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'toml':
        return `style = "${result.style}"\nartist = "${result.artist}"\ntechniques = [${result.techniques.map(t => `"${t}"`).join(', ')}]\ncolorPalette = [${result.colorPalette.map(c => `"${c}"`).join(', ')}]\ncomposition = [${result.composition.map(c => `"${c}"`).join(', ')}]\nmood = "${result.mood}"`;
      case 'txt':
      default:
        return `A ${result.style} style image, in the style of ${result.artist}. Featuring ${result.mood.toLowerCase()} tones, with a color palette of ${result.colorPalette.join(', ')}. Key techniques include ${result.techniques.join(', ')}, and a composition characterized by ${result.composition.join(', ')}.`;
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
    link.download = `style-prompt.${outputFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Analysis Result</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-semibold text-gray-300 mb-2">Style & Artist</h3>
          <Tag>{result.style}</Tag>
          <Tag>{result.artist}</Tag>
        </div>
        <div>
          <h3 className="font-semibold text-gray-300 mb-2">Mood</h3>
          <Tag>{result.mood}</Tag>
        </div>
        <div>
          <h3 className="font-semibold text-gray-300 mb-2">Techniques</h3>
          {result.techniques.map(t => <Tag key={t}>{t}</Tag>)}
        </div>
        <div>
          <h3 className="font-semibold text-gray-300 mb-2">Color Palette</h3>
          {result.colorPalette.map(c => <Tag key={c}>{c}</Tag>)}
        </div>
         <div className="md:col-span-2">
          <h3 className="font-semibold text-gray-300 mb-2">Composition</h3>
          {result.composition.map(c => <Tag key={c}>{c}</Tag>)}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-700">
        <h3 className="font-semibold text-gray-300 mb-3">Export Style Prompt</h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center bg-gray-900 rounded-lg p-1">
                {(['txt', 'json', 'toml'] as OutputFormat[]).map(format => (
                    <button
                        key={format}
                        onClick={() => setOutputFormat(format)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${outputFormat === format ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        {format.toUpperCase()}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    <CopyIcon className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={handleDownload} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    <DownloadIcon className="w-4 h-4" />
                    Download
                </button>
            </div>
        </div>
        <pre className="mt-4 bg-gray-900 p-4 rounded-lg text-gray-300 text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
          <code>{formatOutput}</code>
        </pre>
      </div>
    </div>
  );
};
