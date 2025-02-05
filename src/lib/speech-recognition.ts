// Add Web Speech API TypeScript definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrame: number | null = null;
  private smoothedValues: number[] = Array(12).fill(0);
  private smoothingFactor = 0.3;
  private currentTranscript = '';
  private isFinalResult = false;
  private isRecordingStopped = false;
  private isRecognitionActive = false;

  async initialize() {
    try {
      if (typeof window === 'undefined') return false;
      
      // Check for browser support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech Recognition API not supported in this browser');
      }

      // Initialize recognition first
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;  // Enable continuous recognition
      this.recognition.interimResults = true;  // Get interim results
      this.recognition.lang = 'en-US';

      // Check for microphone permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Clean up test stream
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Microphone access was denied. Please allow microphone access to use voice input.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error('No microphone found. Please connect a microphone to use voice input.');
        } else {
          throw new Error('Failed to access microphone: ' + (err.message || 'Unknown error'));
        }
      }
      
      return true;
    } catch (error: any) {
      console.error('Error initializing speech recognition:', error);
      throw error; // Re-throw to handle in the UI
    }
  }

  async startRecording(
    onVisualizationData: (data: number[]) => void,
    onTranscription: (text: string) => void,
    onError?: (error: Error) => void
  ) {
    try {
      if (!this.recognition) {
        throw new Error('Speech recognition not initialized');
      }

      // Check if recognition is already active
      if (this.isRecognitionActive) {
        return true;
      }

      // Reset state
      this.currentTranscript = '';
      this.isFinalResult = false;
      this.isRecordingStopped = false;
      this.isRecognitionActive = true;

      // Set up audio visualization
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaStream = stream;
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Microphone access was denied. Please allow microphone access to use voice input.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error('No microphone found. Please connect a microphone to use voice input.');
        } else {
          throw new Error('Failed to access microphone: ' + (err.message || 'Unknown error'));
        }
      }

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;
      this.analyser.minDecibels = -85;
      this.analyser.maxDecibels = -10;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream!);
      source.connect(this.analyser);

      // Start audio visualization
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const updateVisualization = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        const bands = Array.from({ length: 12 }, (_, i) => {
          const start = Math.floor(i * dataArray.length / 12);
          const end = Math.floor((i + 1) * dataArray.length / 12);
          const bandValues = dataArray.slice(start, end);
          const currentValue = bandValues.reduce((acc, val) => acc + val, 0) / bandValues.length;
          
          this.smoothedValues[i] = this.smoothedValues[i] * (1 - this.smoothingFactor) + 
                                 currentValue * this.smoothingFactor;
          
          return this.smoothedValues[i];
        });

        onVisualizationData(bands);
        this.animationFrame = requestAnimationFrame(updateVisualization);
      };

      updateVisualization();

      // Set up speech recognition handlers
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            this.isFinalResult = true;
          } else {
            interimTranscript = transcript;
          }
        }

        // Update the current transcript
        if (this.isFinalResult) {
          this.currentTranscript += finalTranscript;
          onTranscription(this.currentTranscript.trim());
        } else if (interimTranscript) {
          // Show interim results with current transcript
          onTranscription((this.currentTranscript + interimTranscript).trim());
        }
      };

      this.recognition.onend = () => {
        this.isRecognitionActive = false;
        // Only restart if we still have an active media stream and haven't explicitly stopped
        if (this.mediaStream && !this.isRecordingStopped) {
          setTimeout(() => {
            if (!this.isRecordingStopped) {
              this.recognition?.start();
              this.isRecognitionActive = true;
            }
          }, 100);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionEvent) => {
        // Handle specific error types
        let errorMessage: string;
        switch (event.error) {
          case 'audio-capture':
            errorMessage = 'No microphone was found or microphone access was denied. Please check your microphone settings.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access was denied. Please allow microphone access to use voice input.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your internet connection.';
            break;
          case 'no-speech':
            // Ignore no-speech errors as they're common
            return;
          case 'aborted':
            // Ignore aborted errors as they happen when we stop recording
            return;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        console.error(errorMessage);
        this.stopRecording();
        if (onError) {
          onError(new Error(errorMessage));
        }
      };

      // Start recognition
      this.recognition.start();
      return true;
    } catch (error) {
      this.isRecognitionActive = false;
      console.error('Error starting recording:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start recording'));
      }
      return false;
    }
  }

  stopRecording() {
    this.isRecordingStopped = true;
    this.isRecognitionActive = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.smoothedValues = Array(12).fill(0);
    this.currentTranscript = '';
    this.isFinalResult = false;
  }

  isInitialized() {
    return !!this.recognition;
  }
}

export const speechRecognition = new SpeechRecognitionService(); 