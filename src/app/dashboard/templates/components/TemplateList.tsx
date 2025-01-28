"use client";

import { useState } from "react";
import { Template } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Edit, Trash } from "lucide-react";
import { deleteTemplate } from "@/services/templates";
import { CreateTemplateDialog } from "@/app/dashboard/templates/components/CreateTemplateDialog";
import { EditTemplateDialog } from "@/app/dashboard/templates/components/EditTemplateDialog";
import { TemplateSettings } from "@/services/templates";

interface TemplateWithSettings extends Template {
  settings: TemplateSettings;
}

interface TemplateListProps {
  initialTemplates: TemplateWithSettings[];
}

export function TemplateList({ initialTemplates }: TemplateListProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithSettings | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: TemplateWithSettings) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
  };

  const handleTemplateCreated = (template: Template) => {
    setTemplates([...templates, template as TemplateWithSettings]);
    setIsCreateDialogOpen(false);
  };

  const handleTemplateUpdated = (template: Template) => {
    setTemplates(
      templates.map((t) => (t.id === template.id ? template as TemplateWithSettings : t))
    );
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>
                  {template.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Used {template.usageCount} times</p>
                  {template.lastUsed && (
                    <p>
                      Last used:{" "}
                      {new Date(template.lastUsed).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTemplateCreated={handleTemplateCreated}
      />

      {selectedTemplate && (
        <EditTemplateDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          template={selectedTemplate}
          onTemplateUpdated={handleTemplateUpdated}
        />
      )}
    </>
  );
} 