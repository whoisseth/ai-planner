"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SettingsType = {
  notifications: boolean;
  emailAlerts: boolean;
  taskReminders: boolean;
  dailySummary: boolean;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType>({
    notifications: true,
    emailAlerts: false,
    taskReminders: true,
    dailySummary: true,
  });

  const handleSettingChange = (setting: keyof SettingsType) => {
    setSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications">Push Notifications</Label>
          <Switch
            id="notifications"
            checked={settings.notifications}
            onCheckedChange={() => handleSettingChange("notifications")}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="emailAlerts">Email Alerts</Label>
          <Switch
            id="emailAlerts"
            checked={settings.emailAlerts}
            onCheckedChange={() => handleSettingChange("emailAlerts")}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="taskReminders">Task Reminders</Label>
          <Switch
            id="taskReminders"
            checked={settings.taskReminders}
            onCheckedChange={() => handleSettingChange("taskReminders")}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="dailySummary">Daily Summary</Label>
          <Switch
            id="dailySummary"
            checked={settings.dailySummary}
            onCheckedChange={() => handleSettingChange("dailySummary")}
          />
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Account Information</h3>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="your@email.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Change Password</Label>
          <Input id="password" type="password" />
        </div>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
