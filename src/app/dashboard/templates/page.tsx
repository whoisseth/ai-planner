"use client";

import { TemplateList } from "@/app/dashboard/templates/components/TemplateList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getTemplates } from "@/services/templates";
import { useState, useEffect } from "react";
import { CreateTemplateDialog } from "@/app/dashboard/templates/components/CreateTemplateDialog";
import { Template } from "@/db/schema";
import { TemplateSettings } from "@/services/templates";

// Extend Template type to include settings
interface TemplateWithSettings extends Template {
  settings: TemplateSettings;
}

export default function TemplatesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  // Update state type to TemplateWithSettings
  const [templates, setTemplates] = useState<TemplateWithSettings[]>([]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await getTemplates();
        // Cast the templates data to TemplateWithSettings type since we know
        // the structure matches what we expect
        setTemplates(data as TemplateWithSettings[]);
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    };

    loadTemplates();
  }, []);

  const handleCreateTemplate = () => {
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Create and manage task templates
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <TemplateList initialTemplates={templates} />

      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTemplateCreated={(template) => {
          // Cast the new template to TemplateWithSettings
          setTemplates([...templates, template as TemplateWithSettings]);
          setIsCreateDialogOpen(false);
        }}
      />
    </div>
  );
} 