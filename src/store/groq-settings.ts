import { atom, useAtom, Getter, Setter } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { toast } from 'sonner';

interface GroqSettings {
  useCustomKey: boolean;
  apiKey: string | null;
}

// Persist settings in localStorage as a fallback
const baseSettingsAtom = atomWithStorage<GroqSettings>('groq-settings', {
  useCustomKey: false,
  apiKey: null,
});

// Loading state atom
const isLoadingAtom = atom(true);

// Async actions
export const updateSettingsAtom = atom(
  null,
  async (get: Getter, set: Setter, newSettings: Partial<GroqSettings>) => {
    const currentSettings = get(baseSettingsAtom);
    const updatedSettings = { ...currentSettings, ...newSettings };

    // Optimistic update
    set(baseSettingsAtom, updatedSettings);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useCustomGroqKey: updatedSettings.useCustomKey,
          groqApiKey: updatedSettings.apiKey,
        }),
      });

      if (!response.ok) throw new Error("Failed to update settings");

      toast.success(
        updatedSettings.useCustomKey
          ? "Using custom GROQ API key"
          : "Using default project API key"
      );
    } catch (error) {
      // Revert on error
      set(baseSettingsAtom, currentSettings);
      toast.error("Failed to update settings");
      console.error("Error updating settings:", error);
    }
  }
);

// Delete API key atom
export const deleteApiKeyAtom = atom(
  null,
  async (get: Getter, set: Setter) => {
    const currentSettings = get(baseSettingsAtom);

    // Optimistic update
    set(baseSettingsAtom, { ...currentSettings, apiKey: null, useCustomKey: false });

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useCustomGroqKey: false,
          groqApiKey: null,
          deleteKey: true, // Signal to completely remove the key
        }),
      });

      if (!response.ok) throw new Error("Failed to delete API key");
      toast.success("API key deleted successfully");
    } catch (error) {
      // Revert on error
      set(baseSettingsAtom, currentSettings);
      toast.error("Failed to delete API key");
      console.error("Error deleting API key:", error);
    }
  }
);

// Initialize settings atom
export const initSettingsAtom = atom(
  null,
  async (get: Getter, set: Setter) => {
    set(isLoadingAtom, true);
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();
      set(baseSettingsAtom, {
        useCustomKey: !!data.useCustomGroqKey,
        apiKey: data.groqApiKey,
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      set(isLoadingAtom, false);
    }
  }
);

// Custom hook for easy access to settings
export function useGroqSettings() {
  const [settings] = useAtom(baseSettingsAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [, updateSettings] = useAtom(updateSettingsAtom);
  const [, initSettings] = useAtom(initSettingsAtom);
  const [, deleteApiKey] = useAtom(deleteApiKeyAtom);

  const toggleCustomKey = async () => {
    await updateSettings({ useCustomKey: !settings.useCustomKey });
  };

  const updateApiKey = async (apiKey: string | null) => {
    await updateSettings({ apiKey });
  };

  return {
    ...settings,
    isLoading,
    toggleCustomKey,
    updateApiKey,
    deleteApiKey,
    initSettings,
  };
} 