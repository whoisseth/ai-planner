"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from "@/components/ui/use-toast";
import { speechRecognition } from "@/lib/speech-recognition";

export const useSpeechRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceActivity, setVoiceActivity] = useState<number[]>([]);
  const lastUpdateTime = useRef<number>(0);
  const currentBands = useRef<number[]>([]);

  const handleVisualizationData = useCallback((bands: number[]) => {
    const now = Date.now();
    if (now - lastUpdateTime.current > 16) {
      lastUpdateTime.current = now;

      // Check if there's a significant change
      const hasChange = !currentBands.current.length || bands.some((val, idx) =>
        Math.abs(val - (currentBands.current[idx] || 0)) > 2
      );

      if (hasChange) {
        currentBands.current = [...bands];
        requestAnimationFrame(() => {
          setVoiceActivity(bands);
        });
      }
    }
  }, []);

  const toggleMicrophone = useCallback(async (
    onTranscription: (text: string) => void
  ) => {
    if (isRecording) {
      speechRecognition.stopRecording();
      setIsRecording(false);
      setVoiceActivity([]);
      currentBands.current = [];
      return;
    }

    if (!speechRecognition.isInitialized()) {
      try {
        await speechRecognition.initialize();
      } catch (err: any) {
        toast({
          title: "Microphone Access Error",
          description: err.message || "Failed to initialize speech recognition. Please check microphone permissions.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await speechRecognition.startRecording(
        handleVisualizationData,
        (text) => {
          if (text.trim()) {
            onTranscription(text);
          }
        },
        (error) => {
          toast({
            title: "Speech Recognition Error",
            description: error.message,
            variant: "destructive",
          });
          setIsRecording(false);
          setVoiceActivity([]);
          currentBands.current = [];
        }
      );

      setIsRecording(true);
    } catch (err: any) {
      console.error('Recording error:', err);
      toast({
        title: "Recording Error",
        description: err.message || "An error occurred while recording. Please try again.",
        variant: "destructive",
      });
      setIsRecording(false);
      setVoiceActivity([]);
      currentBands.current = [];
    }
  }, [isRecording, handleVisualizationData]);

  useEffect(() => {
    return () => {
      if (isRecording) {
        speechRecognition.stopRecording();
        currentBands.current = [];
      }
    };
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (isRecording) {
      speechRecognition.stopRecording();
      setIsRecording(false);
      setVoiceActivity([]);
      currentBands.current = [];
    }
  }, [isRecording]);

  return {
    isRecording,
    voiceActivity,
    toggleMicrophone,
    stopRecording
  };
}; 