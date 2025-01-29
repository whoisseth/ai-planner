// src/components/TagInput.tsx
import { useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "./ui/use-toast";

/**
 * Interface representing a tag with its properties
 */
export interface Tag {
  id: string;
  name: string;
  color: string;
}

/**
 * Props for the TagInput component
 */
interface TagInputProps {
  /** Array of all available tags */
  tags: Tag[];
  /** Array of selected tag IDs */
  selectedTags: string[];
  /** Callback function when tags selection changes */
  onTagsChange: (tags: string[]) => void;
  /** Optional callback function to create a new tag */
  onCreateTag?: (name: string) => Promise<Tag>;
  /** Optional className for styling */
  className?: string;
  /** Maximum number of tags that can be selected */
  maxTags?: number;
}

/**
 * TagInput component for managing tag selection and creation
 * 
 * Features:
 * - Select/deselect tags from existing tags
 * - Create new tags (if onCreateTag is provided)
 * - Search through available tags
 * - Visual feedback for selected tags
 * - Maximum tag limit support
 * - Error handling with toast notifications
 */
export function TagInput({
  tags,
  selectedTags,
  onTagsChange,
  onCreateTag,
  className,
  maxTags,
}: TagInputProps) {
  // State for managing the popover and input
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Handles tag selection/deselection
   * @param tagId The ID of the tag to toggle
   */
  const handleSelect = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter((id) => id !== tagId));
    } else {
      if (maxTags && selectedTags.length >= maxTags) {
        toast({
          title: "Maximum tags reached",
          description: `You can only select up to ${maxTags} tags`,
          variant: "destructive",
        });
        return;
      }
      onTagsChange([...selectedTags, tagId]);
    }
  };

  /**
   * Handles creation of a new tag
   */
  const handleCreateTag = async () => {
    if (!onCreateTag || !inputValue.trim()) return;

    // Check for duplicate tag names
    if (tags.some(tag => tag.name.toLowerCase() === inputValue.trim().toLowerCase())) {
      toast({
        title: "Tag already exists",
        description: "A tag with this name already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const newTag = await onCreateTag(inputValue.trim());
      
      if (maxTags && selectedTags.length >= maxTags) {
        toast({
          title: "Maximum tags reached",
          description: `You can only select up to ${maxTags} tags`,
          variant: "destructive",
        });
        return;
      }
      
      onTagsChange([...selectedTags, newTag.id]);
      setInputValue("");
      setOpen(false);
      
      toast({
        title: "Tag created",
        description: "New tag has been created successfully",
      });
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast({
        title: "Error",
        description: "Failed to create tag. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Get the tag objects for selected tags
  const selectedTagObjects = tags.filter((tag) => selectedTags.includes(tag.id));

  // Filter tags based on search input
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Display selected tags */}
      <div className="flex flex-wrap gap-2">
        {selectedTagObjects.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 pr-1"
            style={{ backgroundColor: `${tag.color}20` }}
          >
            <span style={{ color: tag.color }}>{tag.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => handleSelect(tag.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      {/* Tag selection/creation popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed"
            disabled={maxTags !== undefined && selectedTags.length >= maxTags}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add tag
            {maxTags && (
              <span className="ml-auto text-xs text-muted-foreground">
                {selectedTags.length}/{maxTags}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="top" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create tag..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandEmpty className="p-2">
              {inputValue && onCreateTag && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCreateTag}
                  disabled={isCreating}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isCreating ? "Creating..." : `Create "${inputValue}"`}
                </Button>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  value={tag.name}
                  onSelect={() => handleSelect(tag.id)}
                >
                  <div
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                  {selectedTags.includes(tag.id) && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Selected
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 