## Core Relationships

1. User -> Lists: One-to-Many ✅

   - Each user can have multiple lists ✅
   - System lists created on account creation: ✅
     - Default list (editable, non-deletable) ✅
     - Starred list (non-editable, non-deletable) ✅
     - Done list (non-editable, non-deletable) ✅
   - Lists have a sortOrder property for drag and drop support ✅

2. List -> Tasks: One-to-Many ✅

   - Each list contains multiple tasks ✅
   - Tasks can be moved between lists ✅
   - Tasks are linked to lists via `listId` ✅
   - List deletion cascades to all contained tasks ✅
   - Completed tasks can be automatically moved to Done list ✅

3. Task -> Subtasks: Self-Referential One-to-Many ✅

   - Tasks can have multiple subtasks through self-referential relationship ✅
   - Both tasks and subtasks share the same table/schema ✅
   - Differentiated by `type` field: "main" or "sub" ✅
   - Subtasks reference parent task via `parentId` ✅
   - Cascade deletion from parent to subtasks ✅

4. Task -> Tags: Many-to-Many ❌

   - Tasks can have multiple tags ❌
   - Tags can be applied to multiple tasks ❌
   - Implemented through task_tags junction table ❌
   - Tags are user-specific with unique names per user ❌

5. Task -> Task Dependencies: Many-to-Many ❌

   - Tasks can depend on multiple tasks ❌
   - Tasks can be prerequisites for multiple tasks ❌
   - Implemented through task_dependencies junction table ❌
   - Prevents circular dependencies ❌

6. User -> Templates: One-to-Many ❌
   - Users can create multiple task templates ❌
   - Templates can be shared between users ❌
   - Templates store predefined task settings ❌

## Schema Details

1. Tasks Table: ✅

   - Core Fields: ✅
     - `id`: Primary key (text) ✅
     - `userId`: Foreign key to user (text) ✅
     - `listId`: Foreign key to list with cascade delete (text) ✅
     - `title`: Required task title (text) ✅
     - `description`: Optional description (text) ✅
   - Organization: ✅
     - `type`: "main" or "sub" to distinguish tasks/subtasks ✅
     - `parentId`: Self-reference to parent task (for subtasks) ✅
     - `starred`: Boolean flag for starred tasks ✅
     - `completed`: Boolean completion status ✅
     - `sortOrder`: Integer for ordering within list ✅
   - Time Management: ✅
     - `dueDate`: Optional timestamp ✅
     - `dueTime`: Optional time string ✅
     - `reminder`: JSON object for reminders ❌ {
       time: timestamp,
       type: ["email" | "push" | "both"],
       notifiedAt: timestamp | null,
       recurrence: {
       frequency: ["none" | "daily" | "weekly" | "monthly" | "yearly"],
       interval: number,
       daysOfWeek?: number[],
       endDate?: timestamp,
       count?: number
       }
       }
     - `createdAt`: Auto-set creation timestamp ✅
     - `updatedAt`: Auto-updated modification timestamp ✅
   - Priority: ✅
     - `priority`: Enum ("Low", "Medium", "High", "Urgent") ✅
   - Soft Deletion: ✅
     - `deletedAt`: Optional timestamp ✅
     - `isDeleted`: Boolean flag ✅

2. Lists Table: ✅

   - `id`: Primary key (text) ✅
   - `userId`: Foreign key to user (text) ✅
   - `name`: List name (text) ✅
   - `sortOrder`: Integer for list ordering ✅
   - `isDefault`: Boolean flag for default list ✅
   - `isStarred`: Boolean flag for starred list ✅
   - `isDone`: Boolean flag for done list ✅
   - `isEditable`: Boolean for name editing permission ✅
   - `isDeletable`: Boolean for deletion permission ✅
   - Soft deletion fields ✅
   - Timestamps ✅

3. Templates Table: ❌

   - `id`: Primary key (text) ❌
   - `userId`: Foreign key to user (text) ❌
   - `name`: Template name (text) ❌
   - `description`: Optional description (text) ❌
   - `settings`: JSON object ❌ {
     title?: string,
     description?: string,
     priority?: "Low" | "Medium" | "High" | "Urgent",
     tags?: string[],
     reminder?: ReminderConfig,
     recurrence?: RecurrenceConfig,
     estimatedDuration?: number,
     defaultSubtasks?: {
     title: string,
     description?: string
     }[]
     }
   - `usageCount`: Integer for template usage tracking ❌
   - `lastUsed`: Timestamp of last usage ❌
   - `isPublic`: Boolean for template sharing ❌
   - `createdAt`: Creation timestamp ❌
   - `updatedAt`: Update timestamp ❌

4. Notifications Table: ❌

   - `id`: Primary key (text) ❌
   - `userId`: Foreign key to user (text) ❌
   - `taskId`: Foreign key to tasks (text) ❌
   - `type`: Enum ❌ (
     "reminder" |
     "dependency_blocked" |
     "dependency_unblocked" |
     "task_completed" |
     "task_assigned" |
     "due_soon"
     )
   - `status`: Enum ("pending" | "sent" | "read" | "failed") ❌
   - `channel`: Enum ("email" | "push" | "both") ❌
   - `scheduledFor`: Timestamp ❌
   - `sentAt`: Optional timestamp ❌
   - `readAt`: Optional timestamp ❌
   - `payload`: JSON object with notification details ❌
   - `createdAt`: Creation timestamp ❌
   - `updatedAt`: Update timestamp ❌

5. Tags Table: ❌

   - `id`: Primary key (text) ❌
   - `userId`: Foreign key to user (text) ❌
   - `name`: Tag name (text) ❌
   - `color`: Color code (text) ❌
   - `usageCount`: Integer for tag usage tracking ❌
   - `lastUsed`: Timestamp of last usage ❌
   - `createdAt`: Creation timestamp ❌
   - `updatedAt`: Update timestamp ❌
   - UNIQUE constraint on (userId, name) ❌

6. TaskTags Junction Table: ❌

   - `taskId`: Foreign key to tasks ❌
   - `tagId`: Foreign key to tags ❌
   - `createdAt`: Timestamp when tag was added ❌
   - Composite primary key (taskId, tagId) ❌
   - UNIQUE constraint on (taskId, tagId) ❌
   - Cascade deletion both ways ❌

7. TaskDependencies Junction Table: ❌
   - `dependentTaskId`: Foreign key to tasks (task that depends on another) ❌
   - `prerequisiteTaskId`: Foreign key to tasks (task that must be completed first) ❌
   - `createdAt`: Timestamp when dependency was added ❌
   - Composite primary key (dependentTaskId, prerequisiteTaskId) ❌
   - UNIQUE constraint on (dependentTaskId, prerequisiteTaskId) ❌
   - Cascade deletion both ways ❌
   - CHECK constraint to prevent self-dependencies ❌

## System Lists

1. Default List: ✅

   - Created automatically for each user ✅
   - Name is editable ✅
   - Cannot be deleted ✅
   - `isDefault: true` ✅

2. Starred List: ✅

   - Created automatically for each user ✅
   - Name is not editable ✅
   - Cannot be deleted ✅
   - `isStarred: true` ✅

3. Done List: ✅
   - Created automatically for each user ✅
   - Name is not editable ✅
   - Cannot be deleted ✅
   - `isDone: true` ✅
   - Optional auto-archival of old completed tasks ❌

## Smart Algorithms

1. Tag Suggestions: ❌

   - Content-Based Analysis: ❌
     - Extract keywords from task title and description ❌
     - Match against existing tag names ❌
     - Use NLP for semantic similarity ❌
   - Usage Patterns: ❌
     - Analyze frequently co-occurring tags ❌
     - Consider user's recent tag usage ❌
     - Track tag usage per list/context ❌
   - Time-Based Patterns: ❌
     - Analyze tags used for similar time periods ❌
     - Consider day/week patterns ❌
   - Scoring System: ❌
     - Weighted combination of above factors ❌
     - Recent usage bonus ❌
     - Context relevance score ❌

2. Task Template Suggestions: ❌

   - Usage Frequency Analysis: ❌
     - Track template usage patterns ❌
     - Consider time-of-day/week patterns ❌
   - Context Matching: ❌
     - List-based suggestions ❌
     - Similar task detection ❌
   - User Behavior: ❌
     - Template completion rates ❌
     - Modification patterns after use ❌
   - Adaptive Scoring: ❌
     - Success rate weighting ❌
     - User preference learning ❌

3. Dependency Suggestions: ❌
   - Pattern Recognition: ❌
     - Analyze existing task relationships ❌
     - Identify common sequences ❌
   - Time-Based Analysis: ❌
     - Due date relationships ❌
     - Completion order patterns ❌
   - Content Analysis: ❌
     - Task title/description similarity ❌
     - Shared tag analysis ❌
   - User Workflow: ❌
     - List-based relationships ❌
     - Historical task chains ❌

## Notification System ❌

1. Notification Types: ❌

   - Task Reminders: ❌
     - Due date approaching ❌
     - Start time reminder ❌
     - Custom time-based ❌
   - Dependency Updates: ❌
     - Prerequisite completed ❌
     - Blocking task status ❌
     - Chain completion ❌
   - Assignment Notifications: ❌
     - Task assigned ❌
     - Task shared ❌
     - Collaboration updates ❌
   - System Notifications: ❌
     - Template suggestions ❌
     - Smart tag recommendations ❌
     - Recurring task creation ❌

2. Notification Channels: ❌

   - Email: ❌
     - HTML formatted ❌
     - Action buttons ❌
     - Calendar integration ❌
   - Push Notifications: ❌
     - Mobile devices ❌
     - Desktop browsers ❌
     - Quick actions ❌
   - In-App Notifications: ❌
     - Real-time updates ❌
     - Action center ❌
     - Notification inbox ❌

3. Notification Processing: ❌

   - Scheduling: ❌
     - Priority-based queuing ❌
     - Rate limiting ❌
     - Batch processing ❌
   - Delivery: ❌
     - Retry mechanism ❌
     - Channel fallback ❌
     - Delivery confirmation ❌
   - User Preferences: ❌
     - Channel selection ❌
     - Quiet hours ❌
     - Frequency control ❌

4. Smart Notification Features: ❌
   - Contextual Bundling: ❌
     - Related notification grouping ❌
     - Priority-based bundling ❌
     - Time-based aggregation ❌
   - Intelligent Timing: ❌
     - User activity patterns ❌
     - Timezone awareness ❌
     - Device availability ❌
   - Adaptive Delivery: ❌
     - Response rate analysis ❌
     - Channel effectiveness ❌
     - User engagement metrics ❌

## Implementation Notes

1. Authentication Integration: ✅

   - Use user ID from authentication system ✅
   - All queries must include user ID for data isolation ✅

2. Default Data Creation: ✅

   - Create all system lists on user registration ✅
   - Set appropriate flags for system lists ✅

3. Task Management: ✅

   - Automatic task movement to Done list on completion (optional setting) ✅
   - Dependency validation before task completion ❌
   - Recurring task creation based on recurrence pattern ❌
   - Smart completion date suggestions based on dependencies ❌

4. Data Integrity: ✅

   - Cascade deletions for lists -> tasks ✅
   - Cascade deletions for tasks -> subtasks ✅
   - Cascade deletions for tasks <-> tags ❌
   - Circular dependency prevention ❌
   - NOT NULL constraints on required fields ✅
   - Enum constraints on priority and type fields ✅
   - Unique constraints on user-specific tags ❌

5. Database Indexes: ✅
   Primary Indexes: ✅

   - Tasks: id (PRIMARY KEY) ✅
   - Lists: id (PRIMARY KEY) ✅
   - Tags: id (PRIMARY KEY) ❌

   Foreign Key Indexes: ✅

   - Tasks: userId, listId, parentId ✅
   - Lists: userId ✅
   - Tags: userId ❌
   - TaskTags: taskId, tagId ❌

   Compound Indexes: ✅

   - Tasks: (userId, listId) for filtered queries ✅
   - Tasks: (userId, completed) for done list queries ✅
   - TaskTags: (taskId, tagId) for relationship queries ❌

   Performance Indexes: ✅

   - Tasks: type for task/subtask filtering ✅
   - Tasks: reminder for reminder queries ❌
   - Tasks: deletedAt for cleanup ✅
   - Tasks: isDeleted for active item filtering ✅
   - Lists: sortOrder for list ordering ✅
   - Tasks: sortOrder for task ordering ✅
     Additional Indexes: ❌
   - Tasks: (userId, reminder->time) for reminder processing ❌
   - TaskDependencies: (prerequisiteTaskId) for dependency checks ❌
   - Tags: (userId, name) for unique constraint ❌
   - Tags: (userId, usageCount) for tag suggestions ❌

6. Reminder System: ❌

   - JSON-based reminder configuration ❌
   - Multiple notification channels (email, push) ❌
   - Recurring reminder patterns ❌
   - Notification status tracking ❌
   - Timezone handling ❌

7. Tag System: ❌

   - User-specific tags with unique names ❌
   - Color coding support ❌
   - Usage statistics for smart suggestions ❌
   - Smart tag suggestions based on: ❌
     - Task title and description content analysis ❌
     - Frequently co-occurring tags ❌
     - User's recent tag usage ❌
     - Similar tasks' tags ❌
     - Time-based patterns (e.g., daily, weekly tasks) ❌

8. Recurrence System: ❌

   - Flexible recurrence patterns ❌
   - Support for daily, weekly, monthly, yearly ❌
   - Custom intervals and end conditions ❌
   - Timezone-aware scheduling ❌
   - Instance tracking for series management ❌

9. Dependency Management: ❌
   - Prerequisite task validation ❌
   - Circular dependency prevention ❌
   - Dependency chain visualization ❌
   - Smart scheduling based on dependencies ❌
   - Notification of blocked tasks ❌

## Soft Deletion Strategy ✅

1. Deleted Items Retention: ✅

   - All entities (Tasks, Lists, Tags) support soft deletion ✅
   - Deleted items are kept in DB for 15 days ✅
   - Automatic cleanup after 15 days via scheduled job ❌

2. Soft Deletion Fields (All Tables): ✅

   - `deletedAt`: Timestamp when item was deleted ✅
   - `isDeleted`: Boolean flag for deletion status ✅
   - Items with `isDeleted = true` are hidden from normal queries ✅
   - Items are physically removed after retention period ❌

3. Cleanup Process: ❌

   - Daily scheduled job to check for expired deleted items ❌
   - Items deleted > 15 days ago are physically removed ❌
   - Cascading physical deletion for related items ❌
   - Cleanup job runs during off-peak hours ❌

4. Recovery Process: ❌

   - Items can be restored within 15-day window ❌
   - Restoration preserves all relationships ❌
   - Restoration validates referential integrity ❌

5. Implementation Details: ✅
   - All queries filter by `isDeleted = false` by default ✅
   - Explicit inclusion of deleted items requires special queries ✅
   - Indexes on `deletedAt` and `isDeleted` for efficient filtering ✅
   - Soft deletion respects foreign key relationships ✅

## AI Integration ❌

1. Core AI Components: ❌

   - Groq API: Primary LLM for natural language processing and task management ❌
   - Cohere: Embeddings generation for semantic search and task analysis ❌
   - Pinecone: Vector database for storing and querying embeddings ❌

2. AI Chat System: ❌

   - Chat History Management: ❌
     - Store conversation history with metadata ❌
     - Track context and user preferences ❌
     - Maintain task-related discussion threads ❌
   - Chat Capabilities: ❌
     - Natural language task creation/modification ❌
     - Task status inquiries and updates ❌
     - Smart task organization suggestions ❌
     - Dependency analysis and recommendations ❌
     - Priority and deadline management ❌
     - List organization and restructuring ❌
     - Tag suggestions and management ❌
     - Template creation and application ❌

3. Vector Database Schema (Pinecone): ❌

   - Collections: ❌
     - Task Embeddings: ❌
       - Vector: Cohere embedding of task content ❌
       - Metadata: ❌
         - taskId: Reference to task ❌
         - userId: Owner of task ❌
         - title: Task title ❌
         - description: Task description ❌
         - tags: Associated tags ❌
         - created_at: Creation timestamp ❌
     - Chat History Embeddings: ❌
       - Vector: Cohere embedding of chat message ❌
       - Metadata: ❌
         - messageId: Unique message identifier ❌
         - userId: User identifier ❌
         - timestamp: Message timestamp ❌
         - context: Related task/list IDs ❌
         - type: Message type (user/assistant) ❌

4. AI-Powered Features: ❌

   - Semantic Task Search: ❌
     - Natural language query understanding ❌
     - Context-aware task retrieval ❌
     - Similar task discovery ❌
   - Smart Task Organization: ❌
     - Automatic task categorization ❌
     - Priority suggestions ❌
     - Deadline recommendations ❌
     - List organization optimization ❌
   - Intelligent Assistance: ❌
     - Task breakdown suggestions ❌
     - Dependency identification ❌
     - Time estimation ❌
     - Resource allocation ❌
   - Pattern Recognition: ❌
     - User behavior analysis ❌
     - Task completion patterns ❌
     - Productivity insights ❌
     - Workflow optimization ❌

5. AI Integration Points: ❌

   - Task Creation: ❌
     - Natural language parsing ❌
     - Smart field population ❌
     - Template matching ❌
     - Tag suggestions ❌
   - Task Updates: ❌
     - Context-aware modifications ❌
     - Bulk updates through natural language ❌
     - Smart validation ❌
   - Task Retrieval: ❌
     - Semantic search ❌
     - Natural language filtering ❌
     - Context-based recommendations ❌
   - Task Analysis: ❌
     - Completion pattern analysis ❌
     - Dependency chain optimization ❌
     - Workload balancing ❌
     - Priority adjustment ❌

6. Implementation Details: ❌

   - API Integration: ❌

     - Groq API: ❌
       - Model: mixtral-8x7b-32768 ❌
       - Context window: 32k tokens ❌
       - Use for: Complex reasoning, task analysis ❌
     - Cohere: ❌
       - Model: embed-english-v3.0 ❌
       - Use for: Generating embeddings for tasks and chat ❌
     - Pinecone: ❌
       - Index configuration: ❌
         - Dimensions: 1024 (Cohere v3.0) ❌
         - Metric: cosine similarity ❌
         - Pods: p1.x1 (scalable) ❌

   - Data Flow: ❌

     - Chat Processing: ❌

       1. User input received ❌
       2. Context retrieval from Pinecone ❌
       3. Groq processing with context ❌
       4. Action execution ❌
       5. Response generation ❌
       6. History update and embedding ❌

     - Task Operations: ❌
       1. Natural language intent parsing ❌
       2. Entity extraction ❌
       3. Operation validation ❌
       4. Database operation ❌
       5. Embedding generation ❌
       6. Vector database update ❌

7. Security Considerations: ❌

   - API Key Management: ❌
     - Secure storage of API keys ❌
     - Rate limiting ❌
     - Usage monitoring ❌
   - Data Privacy: ❌
     - User data isolation ❌
     - Selective context sharing ❌
     - PII handling guidelines ❌
   - Access Control: ❌
     - Operation validation ❌
     - Permission checking ❌
     - Audit logging ❌

8. Performance Optimization: ❌
   - Caching Strategy: ❌
     - Embedding cache ❌
     - Frequent query results ❌
     - Context window optimization ❌
   - Batch Processing: ❌
     - Bulk embedding updates ❌
     - Aggregated vector operations ❌
   - Resource Management: ❌
     - API quota monitoring ❌
     - Cost optimization ❌
     - Scale planning ❌

## Vercel AI SDK Implementation ❌

1. SDK Setup and Configuration: ❌

   - Core Dependencies: ❌
     ```json
     {
       "dependencies": {
         "ai": "latest",
         "@ai-sdk/groq": "latest",
         "@vercel/ai-sdk": "latest"
       }
     }
     ```
   - Environment Configuration: ❌
     - GROQ_API_KEY ❌
     - COHERE_API_KEY ❌
     - PINECONE_API_KEY ❌

2. AI Provider Setup: ❌

   - Groq Configuration: ❌

     ```typescript
     import { createGroq } from "@ai-sdk/groq";

     const groq = createGroq({
       apiKey: process.env.GROQ_API_KEY,
       // Optional custom settings
       headers: {
         "Custom-Header": "value",
       },
     });

     // Initialize model
     const model = groq("mixtral-8x7b-32768");
     ```

3. UI Components Integration: ❌

   - Chat Interface: ❌

     ```typescript
     import { useChat } from "ai/react";

     export function ChatComponent() {
       const { messages, input, handleInputChange, handleSubmit } = useChat({
         api: "/api/chat",
         initialMessages: [],
         onResponse: (response) => {
           // Handle streaming response
         },
         onFinish: (message) => {
           // Handle completion
         },
       });
     }
     ```

   - Task Completion: ❌

     ```typescript
     import { useCompletion } from "ai/react";

     export function TaskCreation() {
       const { completion, input, handleInputChange, handleSubmit } =
         useCompletion({
           api: "/api/task-create",
           onFinish: (result) => {
             // Handle task creation completion
           },
         });
     }
     ```

4. API Route Implementation: ❌

   - Chat Endpoint: ❌

     ```typescript
     import { StreamingTextResponse } from "ai";

     export async function POST(req: Request) {
       const { messages } = await req.json();
       const response = await model.chat({
         messages,
         temperature: 0.7,
         maxTokens: 500,
       });

       return new StreamingTextResponse(response);
     }
     ```

   - Task Creation Endpoint: ❌

     ```typescript
     import { StreamingTextResponse, createDataStream } from "ai";

     export async function POST(req: Request) {
       const { prompt } = await req.json();
       const taskStream = await model.generateText({
         prompt,
         temperature: 0.3,
       });

       const dataStream = createDataStream(taskStream, {
         onData: async (data) => {
           // Process task data
           await createTask(data);
         },
       });

       return new StreamingTextResponse(dataStream);
     }
     ```

5. Advanced Features: ❌

   - Reasoning Extraction: ❌

     ```typescript
     import {
       experimental_wrapLanguageModel as wrapLanguageModel,
       extractReasoningMiddleware,
     } from "ai";

     const enhancedModel = wrapLanguageModel({
       model: groq("mixtral-8x7b-32768"),
       middleware: extractReasoningMiddleware({ tagName: "think" }),
     });
     ```

   - Custom Data Streaming: ❌

     ```typescript
     import { createDataStream, StreamingTextResponse } from "ai";

     const stream = createDataStream(response, {
       experimental_streamData: true,
       onData: (data) => {
         // Process custom data
       },
     });
     ```

6. Error Handling: ❌

   - Client-Side: ❌
     ```typescript
     const { messages, error } = useChat({
       onError: (error) => {
         console.error("Chat error:", error);
         // Handle error appropriately
       },
     });
     ```
   - Server-Side: ❌
     ```typescript
     try {
       const response = await model.chat(messages);
       return new StreamingTextResponse(response);
     } catch (error) {
       return new Response(
         JSON.stringify({ error: "Failed to process request" }),
         { status: 500 },
       );
     }
     ```

7. Message Persistence: ❌

   - Database Integration: ❌
     ```typescript
     const { messages } = useChat({
       onFinish: async (message) => {
         await saveMessageToDatabase({
           content: message.content,
           role: message.role,
           // Generate embedding using Cohere
           embedding: await generateEmbedding(message.content),
         });
       },
     });
     ```
   - Context Management: ❌
     ```typescript
     const { messages } = useChat({
       initialMessages: await fetchRelevantContext(),
       body: {
         // Additional context for API route
         taskId: currentTaskId,
         userId: session.user.id,
       },
     });
     ```

8. Performance Considerations: ❌
   - Streaming Optimization: ❌
     - Use appropriate chunk sizes ❌
     - Implement backpressure handling ❌
     - Monitor connection status ❌
   - Caching Strategy: ❌
     - Cache frequent completions ❌
     - Store embeddings efficiently ❌
     - Implement context window management ❌
   - Resource Management: ❌
     - Monitor token usage ❌
     - Implement rate limiting ❌
     - Handle concurrent requests ❌

relationship.md file
follow the ' relationship.md file' And create further features
alwsasys do propper commenting for the code and the file.
alwsy use pnpm to intsll any package
