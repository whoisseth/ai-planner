"use client";

import { useState, useRef, useCallback } from 'react';
import { toast } from "@/components/ui/use-toast";
import { speechRecognition } from "@/lib/speech-recognition";

export const useSpeechRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceActivity, setVoiceActivity] = useState<number[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const toggleMicrophone = useCallback(async (
    onTranscription: (text: string) => void
  ) => {
    if (isRecording) {
      speechRecognition.stopRecording();
      setIsRecording(false);
      setVoiceActivity([]);
      return;
    }

    if (!speechRecognition.isInitialized()) {
      try {
        const success = await speechRecognition.initialize();
        if (!success) {
          toast({
            title: "Speech Recognition Error",
            description: "Please ensure your browser supports speech recognition and microphone access is allowed.",
            variant: "destructive",
          });
          return;
        }
      } catch (err) {
        toast({
          title: "Speech Recognition Error",
          description: "Failed to initialize speech recognition. Please check browser compatibility.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const success = await speechRecognition.startRecording(
        // Visualization callback
        (bands) => {
          setVoiceActivity(bands);
        },
        // Transcription callback
        (text) => {
          if (text.trim()) {
            onTranscription(text);
          }
        }
      );

      if (success) {
        setIsRecording(true);
      } else {
        toast({
          title: "Recording Error",
          description: "Failed to start recording. Please check your microphone permissions.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Recording error:', err);
      toast({
        title: "Recording Error",
        description: "An error occurred while recording. Please try again.",
        variant: "destructive",
      });
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (isRecording) {
      speechRecognition.stopRecording();
      setIsRecording(false);
      setVoiceActivity([]);
    }
  }, [isRecording]);

  return {
    isRecording,
    voiceActivity,
    toggleMicrophone,
    stopRecording
  };
}; 