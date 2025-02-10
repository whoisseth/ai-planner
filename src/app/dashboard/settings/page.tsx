"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Edit, KeyRound, Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useGroqSettings } from "@/store/groq-settings";

export default function SettingsPage() {
  const {
    useCustomKey,
    apiKey,
    isLoading,
    toggleCustomKey,
    updateApiKey,
    deleteApiKey,
    initSettings,
  } = useGroqSettings();

  const [localApiKey, setLocalApiKey] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Initialize settings on component mount
  useEffect(() => {
    initSettings();
  }, [initSettings]);

  // Update local API key when the global state changes
  useEffect(() => {
    if (apiKey) {
      setLocalApiKey(apiKey);
    }
  }, [apiKey]);

  // Check for changes
  useEffect(() => {
    if (isEditing) {
      setHasChanges(localApiKey !== apiKey);
    } else if (!apiKey) {
      // If no API key exists, any input should be considered a change
      setHasChanges(localApiKey.length > 0);
    } else {
      setHasChanges(false);
    }
  }, [localApiKey, apiKey, isEditing]);

  const handleSaveSettings = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await updateApiKey(localApiKey);
      setHasChanges(false);
      setIsEditing(false);
      toast.success("API key updated successfully");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!apiKey) return;

    try {
      await deleteApiKey();
      setLocalApiKey("");
      setIsEditing(false);
      setShowDeleteDialog(false);
      toast.success("API key deleted successfully");
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLocalApiKey(apiKey || "");
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[400px] max-w-2xl items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-4">
      <Card className="border-none bg-background/40 shadow-none backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <CardHeader className="pb-8">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <KeyRound className="h-6 w-6" />
            AI Settings
          </CardTitle>
          <CardDescription className="text-base">
            Configure your AI assistant settings and API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between space-x-4 border-b pb-4">
              <div>
                <Label
                  htmlFor="useCustomGroqKey"
                  className="text-base font-semibold"
                >
                  Use Custom GROQ API Key
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {useCustomKey
                    ? "Using your custom GROQ API key for AI features"
                    : "Using default project API key for AI features"}
                </p>
              </div>
              <Switch
                id="useCustomGroqKey"
                checked={useCustomKey}
                onCheckedChange={toggleCustomKey}
                disabled={apiKey === null}
                className="scale-125 data-[state=checked]:bg-primary"
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="groqApiKey" className="text-sm font-medium">
                    GROQ API Key
                  </Label>
                  <div className="flex items-center gap-2">
                    {apiKey && !isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="size-4" />
                      </Button>
                    )}
                    {apiKey && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteDialog(true)}

                        // className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="group relative">
                  <Input
                    id="groqApiKey"
                    type="password"
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder={
                      apiKey && !isEditing
                        ? "••••••••"
                        : "Enter your GROQ API key"
                    }
                    disabled={Boolean(apiKey) && !isEditing}
                    className={cn(
                      "pr-4 font-mono transition-all",
                      "border-input/50 bg-background/50 focus:border-primary/50 focus:ring-primary/50",
                      "group-hover:border-primary/30",
                      apiKey && !isEditing && "text-muted-foreground",
                    )}
                  />
                </div>
              </div>

              <Alert className="border-none bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Your API key is stored securely. You can temporarily disable
                  its usage without removing it, or delete it completely if
                  needed.
                </AlertDescription>
              </Alert>

              <Alert className="border-none bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Need a GROQ API key? Get one for free from the{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    GROQ Console
                  </a>
                  . You can also{" "}
                  <a
                    href="https://console.groq.com/settings/limits"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    check your usage limits
                  </a>{" "}
                  in the settings.
                </AlertDescription>
              </Alert>
            </div>

            {(!apiKey || isEditing || localApiKey) && (
              <div className="space-y-4 pt-6">
                <div className="flex gap-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving || !hasChanges || !localApiKey}
                    className={cn(
                      "h-11 flex-1 text-base font-medium transition-all",
                      hasChanges && localApiKey
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-muted text-muted-foreground",
                      "disabled:opacity-50",
                    )}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : hasChanges && localApiKey ? (
                      "Save Changes"
                    ) : (
                      "No Changes"
                    )}
                  </Button>
                  {(isEditing || (!apiKey && localApiKey)) && (
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="h-11 flex-1 text-base font-medium"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your GROQ API key? This action
              cannot be undone. After deletion, the system will use the default
              project API key.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteKey}>
              Delete API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
