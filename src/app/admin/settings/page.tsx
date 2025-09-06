'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'Roben Learning Hub',
    siteDescription: 'A modern learning platform',
    adminEmail: 'admin@roben-hub.com',
    maintenanceMode: false,
    registrationEnabled: true,
  });

  const handleSave = () => {
    // Handle save logic here
    alert('Settings saved successfully!');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your application settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Settings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic configuration for your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({...settings, adminEmail: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Control system behavior and access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-gray-600">Put the site in maintenance mode</p>
                </div>
                <Button
                  variant={settings.maintenanceMode ? "destructive" : "outline"}
                  onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                >
                  {settings.maintenanceMode ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>User Registration</Label>
                  <p className="text-sm text-gray-600">Allow new users to register</p>
                </div>
                <Button
                  variant={settings.registrationEnabled ? "default" : "outline"}
                  onClick={() => setSettings({...settings, registrationEnabled: !settings.registrationEnabled})}
                >
                  {settings.registrationEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                Clear Cache
              </Button>
              <Button className="w-full" variant="outline">
                Export Data
              </Button>
              <Button className="w-full" variant="outline">
                Backup Database
              </Button>
              <Button className="w-full" variant="destructive">
                Reset Settings
              </Button>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database:</span>
                <span>PostgreSQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage:</span>
                <span>85% used</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime:</span>
                <span>7 days</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6">
        <Button onClick={handleSave} size="lg">
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
