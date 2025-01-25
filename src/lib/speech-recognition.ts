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

  async initialize() {
    try {
      if (typeof window === 'undefined') return false;
      
      // Check for browser support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('Speech Recognition API not supported in this browser');
        return false;
      }

      // Check for microphone permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Clean up test stream
      } catch (err) {
        console.error('Microphone permission denied:', err);
        return false;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;  // Enable continuous recognition
      this.recognition.interimResults = true;  // Get interim results
      this.recognition.lang = 'en-US';
      
      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      return false;
    }
  }

  async startRecording(
    onVisualizationData: (data: number[]) => void,
    onTranscription: (text: string) => void
  ) {
    try {
      if (!this.recognition) {
        throw new Error('Speech recognition not initialized');
      }

      // Reset state
      this.currentTranscript = '';
      this.isFinalResult = false;
      this.isRecordingStopped = false;

      // Set up audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;
      this.analyser.minDecibels = -85;
      this.analyser.maxDecibels = -10;

      const source = this.audioContext.createMediaStreamSource(stream);
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
        // Only restart if we still have an active media stream and haven't explicitly stopped
        if (this.mediaStream && !this.isRecordingStopped) {
          setTimeout(() => {
            this.recognition?.start();
          }, 100);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionEvent) => {
        // Only log errors that aren't no-speech or aborted
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
          this.stopRecording();
        }
      };

      // Start recognition
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  stopRecording() {
    this.isRecordingStopped = true;

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