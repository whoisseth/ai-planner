import { cohere, pineconeIndex } from "../lib/clients";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";

// Helper function to get embedding vector
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await cohere.embed({
    texts: [text],
    model: "embed-english-v3.0",
    inputType: "search_query",
  });

  if (!response.embeddings || !Array.isArray(response.embeddings)) {
    throw new Error("Invalid embedding response");
  }

  const embedding = response.embeddings[0];
  if (!Array.isArray(embedding)) {
    throw new Error("Invalid embedding format");
  }

  return embedding;
}

// Helper function to save messages and their embeddings
export async function saveMessageWithEmbedding(
  userId: number,
  content: string,
  role: "user" | "assistant",
) {
  // Generate embedding for the message
  // const embedding = await getEmbedding(content);

  // Save message to chat history
  const [message] = await db
    .insert(chatMessages)
    .values({
      userId,
      content,
      role,
      contextId: crypto.randomUUID(),
    })
    .returning();

  // Save embedding to Pinecone
  // TODO: Uncomment this when we have a vector db
  // await pineconeIndex.upsert([
  //   {
  //     id: message.id.toString(),
  //     values: embedding,
  //     metadata: {
  //       userId: userId.toString(),
  //       content,
  //       role,
  //       timestamp: new Date().toISOString(),
  //     },
  //   },
  // ]);

  return message;
}

// Helper function to get relevant context
export async function getRelevantContext(userId: number, query: string) {
  // Generate embedding for the query
  const embedding = await getEmbedding(query);

  // Query Pinecone for similar messages
  const results = await pineconeIndex.query({
    vector: embedding,
    filter: { userId: userId.toString() },
    topK: 5,
    includeMetadata: true,
  });

  // Format context from similar messages
  return results.matches
    .map((match) => match.metadata?.content)
    .filter(Boolean)
    .join("\n");
} 