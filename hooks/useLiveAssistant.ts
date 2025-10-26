import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
// FIX: `LiveSession` is not an exported member of '@google/genai'. It has been removed from this import.
// Instead, a local interface is defined below. `Blob` is imported for use in that interface.
import type { LiveServerMessage, Blob } from '@google/genai';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';
import { ConnectionState } from '../types';
import type { TranscriptEntry } from '../types';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// FIX: Define a local `LiveSession` interface since it's not exported from the SDK.
// This interface is based on the methods used in this component.
interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: { media: Blob }) => void;
}

export const useLiveAssistant = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const cleanup = useCallback(() => {
    audioProcessorRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    
    audioProcessorRef.current = null;
    mediaStreamRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionPromiseRef.current = null;
  }, []);

  const closeSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch(e) {
            console.error("Error closing session:", e);
        }
    }
    cleanup();
    setConnectionState(ConnectionState.CLOSED);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      closeSession();
    };
  }, [closeSession]);


  const startSession = useCallback(async () => {
    if (connectionState !== ConnectionState.IDLE && connectionState !== ConnectionState.CLOSED && connectionState !== ConnectionState.ERROR) return;

    setConnectionState(ConnectionState.CONNECTING);
    setError(null);
    setTranscript([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // FIX: Cast window to any to support webkitAudioContext for older browsers without TypeScript errors.
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      // FIX: Cast window to any to support webkitAudioContext for older browsers without TypeScript errors.
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are an advanced AI designer specialized in CNC, CAD, and JD Paint. Your task is to assist users by answering their questions about CNC design and helping them use this application. Be helpful, concise, and professional.',
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            audioProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
                currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription) {
                currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }
            if(message.serverContent?.turnComplete) {
                const userText = currentInputTranscriptionRef.current.trim();
                const modelText = currentOutputTranscriptionRef.current.trim();
                if (userText) setTranscript(prev => [...prev, { author: 'user', text: userText }]);
                if (modelText) setTranscript(prev => [...prev, { author: 'model', text: modelText }]);
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (audioData && outputAudioContextRef.current) {
                const audioContext = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioData), audioContext, OUTPUT_SAMPLE_RATE, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
                for (const source of audioSourcesRef.current.values()) {
                    source.stop();
                }
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error(e);
            setError('An error occurred with the connection.');
            setConnectionState(ConnectionState.ERROR);
            cleanup();
          },
          onclose: (e: CloseEvent) => {
            setConnectionState(ConnectionState.CLOSED);
            cleanup();
          },
        },
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start session.');
      setConnectionState(ConnectionState.ERROR);
      cleanup();
    }
  }, [connectionState, cleanup]);

  return { connectionState, transcript, error, startSession, closeSession };
};