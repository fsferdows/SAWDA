
import React, { useState, useRef, useEffect } from 'react';
import { useLiveAssistant } from '../hooks/useLiveAssistant';
import { ConnectionState } from '../types';
import type { TranscriptEntry } from '../types';
import { MicIcon, StopIcon, CloseIcon, ChevronUpIcon, ChevronDownIcon, UserIcon, SparklesIcon } from './icons';

const ConnectionStatus: React.FC<{ state: ConnectionState; error: string | null }> = ({ state, error }) => {
    let statusText: string;
    let color: string;

    switch (state) {
        case ConnectionState.CONNECTING:
            statusText = "Connecting...";
            color = "text-yellow-400";
            break;
        case ConnectionState.CONNECTED:
            statusText = "Connected";
            color = "text-green-400";
            break;
        case ConnectionState.CLOSED:
            statusText = "Disconnected";
            color = "text-gray-400";
            break;
        case ConnectionState.ERROR:
            statusText = "Error";
            color = "text-red-400";
            break;
        default:
            statusText = "Ready";
            color = "text-gray-400";
    }

    return (
        <div className="text-center text-sm">
            <p className={color}>{statusText}</p>
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
};

const TranscriptMessage: React.FC<{ entry: TranscriptEntry }> = ({ entry }) => (
    <div className={`flex items-start gap-3 my-4 ${entry.author === 'user' ? 'flex-row' : 'flex-row'}`}>
        <div className={`p-2 rounded-full ${entry.author === 'user' ? 'bg-blue-500' : 'bg-gray-600'}`}>
            {entry.author === 'user' ? <UserIcon className="w-4 h-4 text-white" /> : <SparklesIcon className="w-4 h-4 text-white" />}
        </div>
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-sm">{entry.text}</p>
        </div>
    </div>
);

export const LiveAssistant: React.FC = () => {
    const { connectionState, transcript, error, startSession, closeSession } = useLiveAssistant();
    const [isOpen, setIsOpen] = useState(false);
    const transcriptEndRef = useRef<HTMLDivElement | null>(null);

    const isSessionActive = connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.CONNECTED;

    const toggleSession = () => {
        if (isSessionActive) {
            closeSession();
        } else {
            startSession();
        }
    };
    
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 z-50"
                aria-label="Open AI Assistant"
            >
                <MicIcon className="w-8 h-8" />
            </button>
        );
    }
    
    return (
        <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-300 dark:border-gray-700 z-50">
            <header className="flex items-center justify-between p-4 bg-gray-200 dark:bg-gray-900/50 border-b border-gray-300 dark:border-gray-700">
                <h3 className="font-bold text-lg">AI Assistant</h3>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </header>
            
            <div className="flex-1 p-4 overflow-y-auto">
                 {transcript.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                        <p>Press the microphone to start a conversation.</p>
                    </div>
                )}
                {transcript.map((entry, index) => <TranscriptMessage key={index} entry={entry} />)}
                <div ref={transcriptEndRef} />
            </div>

            <footer className="p-4 border-t border-gray-300 dark:border-gray-700 flex flex-col items-center space-y-3 bg-gray-200 dark:bg-gray-900/50">
                <button
                    onClick={toggleSession}
                    className={`p-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-200 dark:focus:ring-offset-gray-800 ${isSessionActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    aria-label={isSessionActive ? 'Stop session' : 'Start session'}
                >
                    {isSessionActive ? <StopIcon className="w-8 h-8" /> : <MicIcon className="w-8 h-8" />}
                </button>
                <ConnectionStatus state={connectionState} error={error} />
            </footer>
        </div>
    );
};
