// src/services/chat/index.ts
import { ChatGroq } from "@langchain/groq";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { CohereEmbeddings } from "@langchain/cohere";
import { TaskAgent } from "../agents/task-agent";

export class ChatService {
  private groq: ChatGroq;
  private vectorStore: PineconeStore;
  private taskAgent: TaskAgent;

  constructor(private userId: number) {
    // Initialize Groq
    this.groq = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY || '',
      modelName: "mixtral-8x7b-32768",
    });

    // Initialize embeddings
    const embeddings = new CohereEmbeddings({
      apiKey: process.env.COHERE_API_KEY || '',
      model: "embed-english-v3.0"
    });

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });

    // Initialize vector store with embeddings
    this.vectorStore = new PineconeStore(embeddings, {
      pineconeIndex: pinecone.Index(process.env.PINECONE_INDEX || ''),
    });

    this.taskAgent = new TaskAgent(userId);
  }

  async getMessage(userId: number, messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const contextResults = await this.vectorStore.similaritySearch(messages[messages.length - 1].content, 3);
      const context = contextResults.map(doc => doc.pageContent).join('\n');

      const systemMessage = `AI assistant for task management and productivity. 
        Context: ${context}
        Keep responses concise, logical, simple, and to the point.`;

      // Convert messages to the format expected by Groq
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add system message at the start
      const fullConversation = [
        { role: "system", content: systemMessage },
        ...conversationHistory
      ];

      const response = await this.groq.invoke(fullConversation);
      const responseContent = response.content.toString();

      // Save only the latest message pair
      await this.saveMessage(userId, messages[messages.length - 1].content, "user");
      await this.saveMessage(userId, responseContent, "assistant");

      return responseContent;
    } catch (error) {
      console.error("Chat service error:", error);
      throw new Error("Failed to generate response");
    }
  }

  private async saveMessage(
    userId: number, 
    content: string, 
    role: "user" | "assistant"
  ) {
    await db.insert(chatMessages).values({
      userId,
      content,
      role,
      contextId: crypto.randomUUID(),
    });
  }

  async streamMessage(userId: number, content: string) {
    try {
      const agentResponse = await this.taskAgent.processMessage(content);
      const responseText = agentResponse.toString();
      
      await this.saveMessage(userId, content, "user");
      await this.saveMessage(userId, responseText, "assistant");
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const encoder = new TextEncoder();
            let accumulatedText = '';
            
            // Stream character by character
            for (let i = 0; i < responseText.length; i++) {
              accumulatedText += responseText[i];
              const message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: accumulatedText, // Send accumulated text
                createdAt: new Date(),
                isStreaming: true
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            
            // Send final complete message
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: responseText,
              createdAt: new Date(),
              isComplete: true
            })}\n\n`));
            
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return stream;
    } catch (error) {
      console.error('Stream message error:', error);
      throw error;
    }
  }
}