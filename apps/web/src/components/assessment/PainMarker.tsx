"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnatomyDiagram } from "./AnatomyDiagram";
import { cn } from "@/lib/utils";
import type {
  AnatomyRegionId,
  AnatomyView,
  AnatomyPainLocation,
} from "@physioflow/shared-types";
import {
  ANATOMY_REGIONS,
  getSeverityColor,
  getSeverityLabel,
} from "@physioflow/shared-types";

interface PainMarkerProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Current pain locations */
  painLocations: AnatomyPainLocation[];
  /** Callback when pain locations are saved */
  onSave: (painLocations: AnatomyPainLocation[]) => void;
}

/**
 * PainMarker is a dialog component for marking pain locations on an anatomy diagram.
 *
 * It provides:
 * - Front/Back body diagram toggle
 * - Click a region to open the severity/description editor
 * - Severity slider (0-10 VAS scale)
 * - Description textarea
 * - Summary of all marked locations with severity badges
 */
export function PainMarker({
  open,
  onOpenChange,
  painLocations,
  onSave,
}: PainMarkerProps) {
  const [view, setView] = React.useState<AnatomyView>("front");
  const [localRegions, setLocalRegions] = React.useState<AnatomyPainLocation[]>([]);
  const [selectedRegion, setSelectedRegion] =
    React.useState<AnatomyRegionId | null>(null);
  const [severity, setSeverity] = React.useState(5);
  const [description, setDescription] = React.useState("");

  // Sync local state when dialog opens
  React.useEffect(() => {
    if (open) {
      setLocalRegions([...painLocations]);
      setSelectedRegion(null);
      setSeverity(5);
      setDescription("");
    }
  }, [open, painLocations]);

  const handleRegionClick = (regionId: AnatomyRegionId) => {
    setSelectedRegion(regionId);
    const existing = localRegions.find((r) => r.id === regionId);
    if (existing) {
      setSeverity(existing.severity);
      setDescription(existing.description ?? "");
    } else {
      setSeverity(5);
      setDescription("");
    }
  };

  const handleSetPain = () => {
    if (!selectedRegion) return;
    const updated = localRegions.filter((r) => r.id !== selectedRegion);
    if (severity > 0) {
      updated.push({
        id: selectedRegion,
        severity,
        description: description.trim() || undefined,
      });
    }
    setLocalRegions(updated);
    setSelectedRegion(null);
    setSeverity(5);
    setDescription("");
  };

  const handleRemovePain = () => {
    if (!selectedRegion) return;
    setLocalRegions(localRegions.filter((r) => r.id !== selectedRegion));
    setSelectedRegion(null);
    setSeverity(5);
    setDescription("");
  };

  const handleSave = () => {
    onSave(localRegions);
    onOpenChange(false);
  };

  const selectedRegionMeta = selectedRegion
    ? ANATOMY_REGIONS.find((r) => r.id === selectedRegion)
    : null;

  const isExistingRegion = selectedRegion
    ? localRegions.some((r) => r.id === selectedRegion)
    : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Pain Locations</DialogTitle>
          <DialogDescription>
            Click on body regions to mark pain locations with severity ratings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Body Diagram */}
          <div className="space-y-3">
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as AnatomyView)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="front">Front View</TabsTrigger>
                <TabsTrigger value="back">Back View</TabsTrigger>
              </TabsList>

              <TabsContent value="front" className="mt-3">
                <AnatomyDiagram
                  view="front"
                  selectedRegions={localRegions}
                  onRegionClick={handleRegionClick}
                  className="border rounded-lg p-2 bg-white"
                />
              </TabsContent>

              <TabsContent value="back" className="mt-3">
                <AnatomyDiagram
                  view="back"
                  selectedRegions={localRegions}
                  onRegionClick={handleRegionClick}
                  className="border rounded-lg p-2 bg-white"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Pain editor + summary */}
          <div className="space-y-4">
            {/* Region editor */}
            {selectedRegion ? (
              <div className="border rounded-lg p-4 space-y-4" data-testid="pain-editor">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    {selectedRegionMeta?.label ?? selectedRegion}
                  </h3>
                  {isExistingRegion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePain}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Severity (VAS 0-10)</Label>
                    <span
                      className="text-sm font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: getSeverityColor(severity),
                        color: severity > 6 ? "white" : "inherit",
                      }}
                    >
                      {severity}/10 - {getSeverityLabel(severity)}
                    </span>
                  </div>
                  <Slider
                    value={[severity]}
                    onValueChange={(values) => setSeverity(values[0] ?? severity)}
                    min={0}
                    max={10}
                    step={1}
                    data-testid="severity-slider"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>No Pain</span>
                    <span>Worst Pain</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pain-description">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="pain-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the pain (e.g., sharp, dull, radiating...)"
                    rows={3}
                    data-testid="pain-description"
                  />
                </div>

                <Button onClick={handleSetPain} className="w-full" data-testid="set-pain-btn">
                  {isExistingRegion ? "Update Pain" : "Mark Pain"}
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg p-4 text-center text-muted-foreground">
                <p className="text-sm">
                  Click on a body region to mark a pain location.
                </p>
              </div>
            )}

            {/* Marked regions summary */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                Marked Locations ({localRegions.length})
              </h3>
              {localRegions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pain locations marked yet.
                </p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto" data-testid="pain-locations-list">
                  {localRegions
                    .sort((a, b) => b.severity - a.severity)
                    .map((loc) => {
                      const meta = ANATOMY_REGIONS.find(
                        (r) => r.id === loc.id
                      );
                      return (
                        <button
                          key={loc.id}
                          onClick={() => handleRegionClick(loc.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-md text-left text-sm",
                            "hover:bg-accent transition-colors",
                            selectedRegion === loc.id && "bg-accent"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full inline-block"
                              style={{
                                backgroundColor: getSeverityColor(
                                  loc.severity
                                ),
                              }}
                            />
                            <span>{meta?.label ?? loc.id}</span>
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {loc.severity}/10
                          </Badge>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="save-pain-locations">
            Save Pain Locations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
