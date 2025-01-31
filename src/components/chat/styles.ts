import { cn } from "@/lib/utils";

export const chatStyles = {
  markdownPreview: cn(
    "[&_.wmde-markdown]:bg-transparent",
    "[&_blockquote]:pl-4 [&_blockquote]:italic",
    "[&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5",
    "[&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6",
    "[&_pre]:rounded-lg [&_pre]:p-4",
    // Enhanced table styles
    "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg [&_table]:border [&_table]:border-border",
    // Light mode adjustments for better visibility
    "[&_table]:bg-white [&_table]:shadow-sm",
    "[&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-white",
    "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-middle [&_td]:text-white",
    // Dark mode adjustments for better visibility
    "dark:[&_table]:bg-background/20",
    "dark:[&_thead]:bg-muted/30",
    "dark:[&_th]:text-white",
    "dark:[&_td]:text-gray-300",
    // Mobile optimizations
    "text-[13px] md:text-sm",
    // Ensure content is readable
    "prose prose-sm max-w-none dark:prose-invert",
    "[&_p]:mb-2 [&_p]:text-foreground",
    // Scrollable table container
    "[&_table]:block [&_table]:overflow-x-auto md:[&_table]:inline-table",
    "[&_table]:max-w-full",
    // Priority column
    "[&_td:first-child]:whitespace-nowrap [&_td:first-child]:font-medium",
    "[&_th:first-child]:whitespace-nowrap",
    "[&_tr]:text-primary-foreground",
  ),
};
