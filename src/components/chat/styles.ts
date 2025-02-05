import { cn } from "@/lib/utils";

export const chatStyles = {
  markdownPreview: cn(
    "[&_.wmde-markdown]:bg-transparent",
    "[&_blockquote]:pl-4 [&_blockquote]:italic",
    "[&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5",
    "[&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6",
    "[&_pre]:rounded-lg [&_pre]:p-4",
    // Enhanced table styles with fixed border radius
    "[&_table]:relative [&_table]:my-2 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-lg",
    // Remove border collapse for better border radius
    "[&_table]:border-separate [&_table]:border-spacing-0",
    // Light mode adjustments for better visibility
    "[&_table]:bg-white [&_table]:shadow-sm",
    // Table wrapper for border
    "[&_table]:before:absolute [&_table]:before:inset-0 [&_table]:before:rounded-lg [&_table]:before:border [&_table]:before:border-border",
    // Adjust cell borders for consistency
    "[&_th]:border-b [&_th]:border-r [&_th]:border-border/50 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-white [&_th]:relative",
    "[&_th:last-child]:border-r-0",
    "[&_td]:border-b [&_td]:border-r [&_td]:border-border/50 [&_td]:p-2 [&_td]:align-middle [&_td]:text-white [&_td]:relative",
    "[&_td:last-child]:border-r-0",
    "[&_tr:last-child_td]:border-b-0",
    // First row top corners
    "[&_tr:first-child_th:first-child]:rounded-tl-lg",
    "[&_tr:first-child_th:last-child]:rounded-tr-lg",
    // Last row bottom corners
    "[&_tr:last-child_td:first-child]:rounded-bl-lg",
    "[&_tr:last-child_td:last-child]:rounded-br-lg",
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
