import { removeStopwords } from "stopword";

/**
 * Analyzes text to extract relevant keywords for tag matching
 */
export async function analyzeText(text: string): Promise<string[]> {
  // Convert to lowercase and remove special characters
  const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  
  // Split into words
  const words = cleanText.split(/\s+/).filter(word => word.length > 2);
  
  // Remove stopwords
  const keywords = removeStopwords(words) as string[];
  
  // Remove duplicates and return
  return [...new Set(keywords)];
}

/**
 * Calculates semantic similarity between two pieces of text
 * This is a simple implementation that could be enhanced with more sophisticated NLP techniques
 */
export async function calculateSimilarity(text1: string, text2: string): Promise<number> {
  const [keywords1, keywords2] = await Promise.all([
    analyzeText(text1),
    analyzeText(text2)
  ]);
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Extracts key phrases from text
 */
export function extractKeyPhrases(text: string): string[] {
  // Split text into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Process each sentence
  const phrases = sentences.flatMap(sentence => {
    // Remove special characters and convert to lowercase
    const clean = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
    
    // Split into words
    const words = clean.split(/\s+/).filter(word => word.length > 2);
    
    // Remove stopwords
    const keywords = removeStopwords(words) as string[];
    
    // Create phrases from consecutive words (2-3 words)
    const phrases: string[] = [];
    for (let i = 0; i < keywords.length - 1; i++) {
      phrases.push(keywords[i] + " " + keywords[i + 1]);
      if (i < keywords.length - 2) {
        phrases.push(keywords[i] + " " + keywords[i + 1] + " " + keywords[i + 2]);
      }
    }
    
    return phrases;
  });
  
  // Remove duplicates and return
  return [...new Set(phrases)];
} 