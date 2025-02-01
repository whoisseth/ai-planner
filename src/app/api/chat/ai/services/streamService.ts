/**
 * Types and utilities for handling streaming responses
 */

interface StreamMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  isComplete: boolean;
  isStreaming: boolean;
}

interface StreamHandlers {
  sendMessage: (content: string, isComplete?: boolean) => Promise<void>;
  close: () => Promise<void>;
  getReadableStream: () => ReadableStream;
}

/**
 * Creates handlers for managing a streaming response
 */
export function createStreamHandlers(): StreamHandlers {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  return {
    async sendMessage(content: string, isComplete = false) {
      const message: StreamMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        createdAt: new Date(),
        isComplete,
        isStreaming: !isComplete,
      };
      
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
      );
    },

    async close() {
      await writer.close();
    },

    getReadableStream() {
      return stream.readable;
    }
  };
} 