import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";

// Initialize Pinecone client
export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

// Initialize Cohere client
export const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

// Initialize Pinecone index
export const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX || ""); 