// Web Speech API TypeScript definitions
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognition extends EventTarget {
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

export interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface ChatMessage {
  role: string;
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

import { Message } from "ai";

// Props and state interfaces
export interface ChatUIState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isDragging: boolean;
  isFullScreen: boolean;
  setIsFullScreen: (isFullScreen: boolean) => void;
  width: number;
  setWidth: (width: number) => void;
  isMobile: boolean;
  showScrollButton: boolean;
  chatBoxRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  scrollToBottom: () => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>, hasMore: boolean, isLoadingMore: boolean, isAtBottom: boolean, loadMoreCallback: () => void) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  adjustTextareaHeight: () => void;
}

export interface ChatState {
  cursor: string | null;
  initialMessages: Message[];
  copiedMessageId: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  hasLoadedInitialMessages: boolean;
}

export interface MessageCopyState {
  copiedMessageId: string | null;
  setCopiedMessageId: (id: string | null) => void;
}

export interface ScrollState {
  showScrollButton: boolean;
  scrollToBottom: () => void;
}

export interface ChatHeaderProps {
  isFullScreen: boolean;
  isMobile: boolean;
  setIsFullScreen: (value: boolean) => void;
  setIsOpen: (value: boolean) => void;
  setWidth: (value: number) => void;
}

export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isRecording: boolean;
  handleFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  toggleMicrophone: (callback: (text: string) => void) => void;
  stopRecording: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  voiceActivity: number[];
}

export interface MessageListProps {
  messages: Message[];
  isLoadingMore: boolean;
  isLoading: boolean;
  copiedMessageId: string | null;
  handleCopyMessage: (message: Message) => void;
} 