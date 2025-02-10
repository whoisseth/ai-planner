import React, { RefObject } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mic, MicOff, Send, Square } from "lucide-react";
import { VoiceWave } from '../VoiceWave';
import { cn } from "@/lib/utils";

interface ChatInputProps {
    input: string;
    isLoading: boolean;
    isRecording: boolean;
    voiceActivity: number[];
    textareaRef: RefObject<HTMLTextAreaElement>;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    toggleMicrophone: (callback: (text: string) => void) => void;
    stopRecording: () => void;
    setInput: (text: string) => void;
    adjustTextareaHeight: () => void;
    stop: () => void;
}

/**
 * ChatInput component handles the input area of the chat including text input,
 * voice recording, and message submission
 */
export function ChatInput({
    input,
    isLoading,
    isRecording,
    voiceActivity,
    textareaRef,
    handleInputChange,
    handleFormSubmit,
    toggleMicrophone,
    stopRecording,
    setInput,
    adjustTextareaHeight,
    stop,
}: ChatInputProps) {
    return (
        <div className="border-t px-4 py-3">
            <div className="relative flex items-center rounded-xl border">
                {isRecording && <VoiceWave isRecording={isRecording} voiceActivity={voiceActivity} />}
                <form onSubmit={handleFormSubmit} className="flex-1" id="chat-form">
                    <Textarea
                        rows={2}
                        autoFocus
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => {
                            handleInputChange(e);
                            requestAnimationFrame(adjustTextareaHeight);
                        }}
                        onFocus={() => {
                            if (isRecording) {
                                stopRecording();
                            }
                        }}
                        placeholder="Type a message..."
                        className="min-h-[96px] w-full rounded-lg resize-none border-0 bg-transparent py-3 text-sm focus:ring-0 overflow-y-auto"
                        style={{
                            maxHeight: '200px',
                            paddingRight: '80px',
                            paddingBottom: '12px',
                            overflowY: 'auto',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(0,0,0,0.2) transparent'
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleFormSubmit(e as any);
                            }
                        }}
                    />
                </form>
                <div className="absolute right-0 bottom-0 flex items-center gap-1 px-2  ">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full hidden"
                        onClick={() => toggleMicrophone((text) => setInput(text))}
                    >
                        {isRecording ? (
                            <MicOff className="size-5 text-red-500" />
                        ) : (
                            <Mic className="size-5 text-zinc-400 " />
                        )}
                    </Button>
                    {isLoading ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn("rounded-full")}
                            onClick={stop}
                            title="Stop generating"
                        >
                            <Square className="h-5 w-5" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            disabled={!input.trim()}
                            className="rounded-full"
                            onClick={(e) => {
                                e.preventDefault();
                                if (input.trim()) {
                                    handleFormSubmit(e as any);
                                }
                            }}
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
} 