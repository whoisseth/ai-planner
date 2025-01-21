// src/services/chat/index.ts
import { ChatGroq } from "@langchain/groq";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { CohereEmbeddings } from "@langchain/cohere";

export class ChatService {
  private groq: ChatGroq;
  private vectorStore: PineconeStore;

  constructor() {
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
}