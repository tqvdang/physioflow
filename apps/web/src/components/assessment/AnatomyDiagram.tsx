"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  AnatomyRegionId,
  AnatomyView,
  AnatomyPainLocation,
  AnatomyRegionMeta,
} from "@physioflow/shared-types";
import { getSeverityColor, ANATOMY_REGIONS } from "@physioflow/shared-types";
import { useAnatomyRegions } from "@/hooks/use-anatomy-regions";

interface AnatomyDiagramProps {
  /** Which view to display: front or back */
  view: AnatomyView;
  /** Currently selected/marked pain regions */
  selectedRegions: AnatomyPainLocation[];
  /** Callback when a region is clicked */
  onRegionClick: (regionId: AnatomyRegionId) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AnatomyDiagram renders an interactive SVG body diagram.
 *
 * Regions are rendered inline (not loaded from SVG files) so we can
 * attach click handlers and apply dynamic severity-based fill colors.
 * The diagram has 30+ clickable body regions per view.
 */
export function AnatomyDiagram({
  view,
  selectedRegions,
  onRegionClick,
  className,
}: AnatomyDiagramProps) {
  // Fetch regions from API; fall back to hardcoded ANATOMY_REGIONS on error/loading
  const { data: apiRegions } = useAnatomyRegions();

  const regionsMeta: AnatomyRegionMeta[] = React.useMemo(() => {
    if (!apiRegions || apiRegions.length === 0) return ANATOMY_REGIONS;
    return apiRegions.map((r) => ({
      id: r.id as AnatomyRegionId,
      label: r.name,
      labelVi: r.name_vi,
      view: r.view as AnatomyView,
    }));
  }, [apiRegions]);

  const severityMap = React.useMemo(() => {
    const map = new Map<string, AnatomyPainLocation>();
    for (const region of selectedRegions) {
      map.set(region.id, region);
    }
    return map;
  }, [selectedRegions]);

  const regionsForView = React.useMemo(
    () => regionsMeta.filter((r) => r.view === view),
    [regionsMeta, view]
  );

  const getRegionFill = (regionId: string): string => {
    const loc = severityMap.get(regionId);
    if (!loc) return "transparent";
    return getSeverityColor(loc.severity);
  };

  const getRegionStroke = (regionId: string): string => {
    const loc = severityMap.get(regionId);
    if (!loc) return "transparent";
    return "rgba(0, 0, 0, 0.3)";
  };

  return (
    <div className={cn("relative select-none", className)}>
      <svg
        viewBox="0 0 400 700"
        className="w-full h-auto max-h-[600px]"
        role="img"
        aria-label={
          view === "front"
            ? "Front body diagram"
            : "Back body diagram"
        }
      >
        {/* Body silhouette */}
        <g className="body-silhouette">
          {/* Head */}
          <ellipse cx="200" cy="52" rx="32" ry="38" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />
          {/* Neck */}
          <rect x="188" y="88" width="24" height="22" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="3" />
          {/* Torso */}
          <rect x="145" y="110" width="110" height="190" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="8" />
          {/* Left Arm */}
          <rect x="88" y="120" width="55" height="22" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="8" />
          <rect x="88" y="140" width="28" height="70" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="10" />
          <rect x="80" y="208" width="28" height="18" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="8" />
          <rect x="76" y="225" width="24" height="60" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="8" />
          <ellipse cx="80" cy="310" rx="14" ry="22" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />
          {/* Right Arm */}
          <rect x="257" y="120" width="55" height="22" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="8" />
          <rect x="284" y="140" width="28" height="70" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="10" />
          <rect x="292" y="208" width="28" height="18" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="8" />
          <rect x="300" y="225" width="24" height="60" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="8" />
          <ellipse cx="320" cy="310" rx="14" ry="22" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />
          {/* Pelvis */}
          <rect x="150" y="300" width="100" height="55" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="8" />
          {/* Left Leg */}
          <rect x="152" y="355" width="42" height="95" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="12" />
          <ellipse cx="173" cy="468" rx="18" ry="20" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />
          <rect x="155" y="488" width="36" height="95" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="10" />
          <ellipse cx="173" cy="598" rx="14" ry="16" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />
          <ellipse cx="170" cy="635" rx="20" ry="22" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />
          {/* Right Leg */}
          <rect x="206" y="355" width="42" height="95" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="12" />
          <ellipse cx="227" cy="468" rx="18" ry="20" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />
          <rect x="209" y="488" width="36" height="95" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" rx="10" />
          <ellipse cx="227" cy="598" rx="14" ry="16" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />
          <ellipse cx="230" cy="635" rx="20" ry="22" fill="#f0f0f0" stroke="#bbb" strokeWidth="1" />

          {/* Spine line for back view */}
          {view === "back" && (
            <line x1="200" y1="92" x2="200" y2="310" stroke="#ddd" strokeWidth="1.5" strokeDasharray="4" />
          )}
        </g>

        {/* Interactive clickable regions */}
        <g className="interactive-regions">
          {view === "front" ? (
            <FrontRegions
              onRegionClick={onRegionClick}
              getRegionFill={getRegionFill}
              getRegionStroke={getRegionStroke}
              regionsForView={regionsForView}
              regionsMeta={regionsMeta}
            />
          ) : (
            <BackRegions
              onRegionClick={onRegionClick}
              getRegionFill={getRegionFill}
              getRegionStroke={getRegionStroke}
              regionsForView={regionsForView}
              regionsMeta={regionsMeta}
            />
          )}
        </g>

        {/* Severity indicators on marked regions */}
        <g className="severity-labels">
          {selectedRegions
            .filter((r) => {
              const meta = regionsMeta.find((m) => m.id === r.id);
              return meta && meta.view === view;
            })
            .map((r) => {
              const pos = getRegionCenter(r.id, view);
              if (!pos) return null;
              return (
                <g key={`label-${r.id}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="10"
                    fill="white"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#333"
                  >
                    {r.severity}
                  </text>
                </g>
              );
            })}
        </g>
      </svg>
    </div>
  );
}

// Common props for region group components
interface RegionGroupProps {
  onRegionClick: (regionId: AnatomyRegionId) => void;
  getRegionFill: (regionId: string) => string;
  getRegionStroke: (regionId: string) => string;
  regionsForView: { id: AnatomyRegionId; label: string }[];
  regionsMeta: AnatomyRegionMeta[];
}

function RegionShape({
  id,
  onRegionClick,
  regionsMeta,
  children,
}: {
  id: AnatomyRegionId;
  onRegionClick: (regionId: AnatomyRegionId) => void;
  regionsMeta: AnatomyRegionMeta[];
  getRegionFill?: (regionId: string) => string;
  getRegionStroke?: (regionId: string) => string;
  children: React.ReactNode;
}) {
  const label = regionsMeta.find((r) => r.id === id)?.label ?? id;
  return (
    <g
      id={id}
      onClick={() => onRegionClick(id)}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRegionClick(id);
        }
      }}
    >
      <title>{label}</title>
      {children}
    </g>
  );
}

function FrontRegions({ onRegionClick, getRegionFill, getRegionStroke, regionsMeta }: RegionGroupProps) {
  const rp = { onRegionClick, getRegionFill, getRegionStroke, regionsMeta };
  return (
    <>
      <RegionShape id="head" {...rp}>
        <ellipse cx="200" cy="52" rx="30" ry="36" fill={getRegionFill("head")} stroke={getRegionStroke("head")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="neck_front" {...rp}>
        <rect x="189" y="89" width="22" height="20" rx="3" fill={getRegionFill("neck_front")} stroke={getRegionStroke("neck_front")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="shoulder_left" {...rp}>
        <ellipse cx="130" cy="126" rx="22" ry="16" fill={getRegionFill("shoulder_left")} stroke={getRegionStroke("shoulder_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="shoulder_right" {...rp}>
        <ellipse cx="270" cy="126" rx="22" ry="16" fill={getRegionFill("shoulder_right")} stroke={getRegionStroke("shoulder_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="chest_left" {...rp}>
        <rect x="147" y="115" width="50" height="50" rx="5" fill={getRegionFill("chest_left")} stroke={getRegionStroke("chest_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="chest_right" {...rp}>
        <rect x="203" y="115" width="50" height="50" rx="5" fill={getRegionFill("chest_right")} stroke={getRegionStroke("chest_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="upper_arm_left_front" {...rp}>
        <rect x="90" y="142" width="26" height="55" rx="10" fill={getRegionFill("upper_arm_left_front")} stroke={getRegionStroke("upper_arm_left_front")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="upper_arm_right_front" {...rp}>
        <rect x="286" y="142" width="26" height="55" rx="10" fill={getRegionFill("upper_arm_right_front")} stroke={getRegionStroke("upper_arm_right_front")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="abdomen_upper" {...rp}>
        <rect x="150" y="170" width="100" height="50" rx="5" fill={getRegionFill("abdomen_upper")} stroke={getRegionStroke("abdomen_upper")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="elbow_left" {...rp}>
        <ellipse cx="97" cy="210" rx="14" ry="14" fill={getRegionFill("elbow_left")} stroke={getRegionStroke("elbow_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="elbow_right" {...rp}>
        <ellipse cx="303" cy="210" rx="14" ry="14" fill={getRegionFill("elbow_right")} stroke={getRegionStroke("elbow_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="abdomen_lower" {...rp}>
        <rect x="150" y="225" width="100" height="50" rx="5" fill={getRegionFill("abdomen_lower")} stroke={getRegionStroke("abdomen_lower")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="forearm_left" {...rp}>
        <rect x="78" y="228" width="22" height="50" rx="8" fill={getRegionFill("forearm_left")} stroke={getRegionStroke("forearm_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="forearm_right" {...rp}>
        <rect x="302" y="228" width="22" height="50" rx="8" fill={getRegionFill("forearm_right")} stroke={getRegionStroke("forearm_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="wrist_hand_left" {...rp}>
        <ellipse cx="80" cy="310" rx="12" ry="20" fill={getRegionFill("wrist_hand_left")} stroke={getRegionStroke("wrist_hand_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="wrist_hand_right" {...rp}>
        <ellipse cx="320" cy="310" rx="12" ry="20" fill={getRegionFill("wrist_hand_right")} stroke={getRegionStroke("wrist_hand_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="hip_left" {...rp}>
        <ellipse cx="170" cy="310" rx="18" ry="15" fill={getRegionFill("hip_left")} stroke={getRegionStroke("hip_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="hip_right" {...rp}>
        <ellipse cx="230" cy="310" rx="18" ry="15" fill={getRegionFill("hip_right")} stroke={getRegionStroke("hip_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="groin_left" {...rp}>
        <ellipse cx="178" cy="340" rx="15" ry="12" fill={getRegionFill("groin_left")} stroke={getRegionStroke("groin_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="groin_right" {...rp}>
        <ellipse cx="222" cy="340" rx="15" ry="12" fill={getRegionFill("groin_right")} stroke={getRegionStroke("groin_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="thigh_left_front" {...rp}>
        <rect x="154" y="358" width="38" height="85" rx="12" fill={getRegionFill("thigh_left_front")} stroke={getRegionStroke("thigh_left_front")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="thigh_right_front" {...rp}>
        <rect x="208" y="358" width="38" height="85" rx="12" fill={getRegionFill("thigh_right_front")} stroke={getRegionStroke("thigh_right_front")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="knee_left" {...rp}>
        <ellipse cx="173" cy="468" rx="16" ry="18" fill={getRegionFill("knee_left")} stroke={getRegionStroke("knee_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="knee_right" {...rp}>
        <ellipse cx="227" cy="468" rx="16" ry="18" fill={getRegionFill("knee_right")} stroke={getRegionStroke("knee_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="lower_leg_left_front" {...rp}>
        <rect x="157" y="490" width="32" height="85" rx="10" fill={getRegionFill("lower_leg_left_front")} stroke={getRegionStroke("lower_leg_left_front")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="lower_leg_right_front" {...rp}>
        <rect x="211" y="490" width="32" height="85" rx="10" fill={getRegionFill("lower_leg_right_front")} stroke={getRegionStroke("lower_leg_right_front")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="ankle_left" {...rp}>
        <ellipse cx="173" cy="598" rx="12" ry="14" fill={getRegionFill("ankle_left")} stroke={getRegionStroke("ankle_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="ankle_right" {...rp}>
        <ellipse cx="227" cy="598" rx="12" ry="14" fill={getRegionFill("ankle_right")} stroke={getRegionStroke("ankle_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="foot_left" {...rp}>
        <ellipse cx="170" cy="635" rx="18" ry="20" fill={getRegionFill("foot_left")} stroke={getRegionStroke("foot_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="foot_right" {...rp}>
        <ellipse cx="230" cy="635" rx="18" ry="20" fill={getRegionFill("foot_right")} stroke={getRegionStroke("foot_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
    </>
  );
}

function BackRegions({ onRegionClick, getRegionFill, getRegionStroke, regionsMeta }: RegionGroupProps) {
  const rp = { onRegionClick, getRegionFill, getRegionStroke, regionsMeta };
  return (
    <>
      <RegionShape id="neck_back" {...rp}>
        <rect x="189" y="89" width="22" height="20" rx="3" fill={getRegionFill("neck_back")} stroke={getRegionStroke("neck_back")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="cervical_spine" {...rp}>
        <rect x="190" y="112" width="20" height="28" rx="5" fill={getRegionFill("cervical_spine")} stroke={getRegionStroke("cervical_spine")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="shoulder_left" {...rp}>
        <ellipse cx="130" cy="126" rx="22" ry="16" fill={getRegionFill("shoulder_left")} stroke={getRegionStroke("shoulder_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="shoulder_right" {...rp}>
        <ellipse cx="270" cy="126" rx="22" ry="16" fill={getRegionFill("shoulder_right")} stroke={getRegionStroke("shoulder_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="thoracic_spine_upper" {...rp}>
        <rect x="165" y="142" width="70" height="48" rx="5" fill={getRegionFill("thoracic_spine_upper")} stroke={getRegionStroke("thoracic_spine_upper")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="upper_arm_left_back" {...rp}>
        <rect x="90" y="142" width="26" height="55" rx="10" fill={getRegionFill("upper_arm_left_back")} stroke={getRegionStroke("upper_arm_left_back")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="upper_arm_right_back" {...rp}>
        <rect x="286" y="142" width="26" height="55" rx="10" fill={getRegionFill("upper_arm_right_back")} stroke={getRegionStroke("upper_arm_right_back")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="thoracic_spine_lower" {...rp}>
        <rect x="165" y="195" width="70" height="48" rx="5" fill={getRegionFill("thoracic_spine_lower")} stroke={getRegionStroke("thoracic_spine_lower")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="elbow_left" {...rp}>
        <ellipse cx="97" cy="210" rx="14" ry="14" fill={getRegionFill("elbow_left")} stroke={getRegionStroke("elbow_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="elbow_right" {...rp}>
        <ellipse cx="303" cy="210" rx="14" ry="14" fill={getRegionFill("elbow_right")} stroke={getRegionStroke("elbow_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="forearm_left" {...rp}>
        <rect x="78" y="228" width="22" height="50" rx="8" fill={getRegionFill("forearm_left")} stroke={getRegionStroke("forearm_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="forearm_right" {...rp}>
        <rect x="302" y="228" width="22" height="50" rx="8" fill={getRegionFill("forearm_right")} stroke={getRegionStroke("forearm_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="lumbar_spine" {...rp}>
        <rect x="170" y="248" width="60" height="42" rx="5" fill={getRegionFill("lumbar_spine")} stroke={getRegionStroke("lumbar_spine")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="wrist_hand_left" {...rp}>
        <ellipse cx="80" cy="310" rx="12" ry="20" fill={getRegionFill("wrist_hand_left")} stroke={getRegionStroke("wrist_hand_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="wrist_hand_right" {...rp}>
        <ellipse cx="320" cy="310" rx="12" ry="20" fill={getRegionFill("wrist_hand_right")} stroke={getRegionStroke("wrist_hand_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="sacrum" {...rp}>
        <rect x="180" y="295" width="40" height="28" rx="5" fill={getRegionFill("sacrum")} stroke={getRegionStroke("sacrum")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="gluteal_left" {...rp}>
        <ellipse cx="170" cy="330" rx="22" ry="18" fill={getRegionFill("gluteal_left")} stroke={getRegionStroke("gluteal_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="gluteal_right" {...rp}>
        <ellipse cx="230" cy="330" rx="22" ry="18" fill={getRegionFill("gluteal_right")} stroke={getRegionStroke("gluteal_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="thigh_left_back" {...rp}>
        <rect x="154" y="358" width="38" height="85" rx="12" fill={getRegionFill("thigh_left_back")} stroke={getRegionStroke("thigh_left_back")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="thigh_right_back" {...rp}>
        <rect x="208" y="358" width="38" height="85" rx="12" fill={getRegionFill("thigh_right_back")} stroke={getRegionStroke("thigh_right_back")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="knee_left_back" {...rp}>
        <ellipse cx="173" cy="468" rx="16" ry="18" fill={getRegionFill("knee_left_back")} stroke={getRegionStroke("knee_left_back")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="knee_right_back" {...rp}>
        <ellipse cx="227" cy="468" rx="16" ry="18" fill={getRegionFill("knee_right_back")} stroke={getRegionStroke("knee_right_back")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="calf_left" {...rp}>
        <rect x="157" y="490" width="32" height="85" rx="10" fill={getRegionFill("calf_left")} stroke={getRegionStroke("calf_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="calf_right" {...rp}>
        <rect x="211" y="490" width="32" height="85" rx="10" fill={getRegionFill("calf_right")} stroke={getRegionStroke("calf_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="ankle_left" {...rp}>
        <ellipse cx="173" cy="598" rx="12" ry="14" fill={getRegionFill("ankle_left")} stroke={getRegionStroke("ankle_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="ankle_right" {...rp}>
        <ellipse cx="227" cy="598" rx="12" ry="14" fill={getRegionFill("ankle_right")} stroke={getRegionStroke("ankle_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="foot_left" {...rp}>
        <ellipse cx="170" cy="635" rx="18" ry="20" fill={getRegionFill("foot_left")} stroke={getRegionStroke("foot_left")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
      <RegionShape id="foot_right" {...rp}>
        <ellipse cx="230" cy="635" rx="18" ry="20" fill={getRegionFill("foot_right")} stroke={getRegionStroke("foot_right")} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
      </RegionShape>
    </>
  );
}

/**
 * Returns the approximate center coordinates of a region for placing severity labels.
 */
function getRegionCenter(
  regionId: string,
  view: AnatomyView
): { x: number; y: number } | null {
  const centers: Record<string, Record<string, { x: number; y: number }>> = {
    front: {
      head: { x: 200, y: 52 },
      neck_front: { x: 200, y: 99 },
      shoulder_left: { x: 130, y: 126 },
      shoulder_right: { x: 270, y: 126 },
      chest_left: { x: 172, y: 140 },
      chest_right: { x: 228, y: 140 },
      upper_arm_left_front: { x: 103, y: 170 },
      upper_arm_right_front: { x: 299, y: 170 },
      abdomen_upper: { x: 200, y: 195 },
      elbow_left: { x: 97, y: 210 },
      elbow_right: { x: 303, y: 210 },
      abdomen_lower: { x: 200, y: 250 },
      forearm_left: { x: 89, y: 253 },
      forearm_right: { x: 313, y: 253 },
      wrist_hand_left: { x: 80, y: 310 },
      wrist_hand_right: { x: 320, y: 310 },
      hip_left: { x: 170, y: 310 },
      hip_right: { x: 230, y: 310 },
      groin_left: { x: 178, y: 340 },
      groin_right: { x: 222, y: 340 },
      thigh_left_front: { x: 173, y: 400 },
      thigh_right_front: { x: 227, y: 400 },
      knee_left: { x: 173, y: 468 },
      knee_right: { x: 227, y: 468 },
      lower_leg_left_front: { x: 173, y: 532 },
      lower_leg_right_front: { x: 227, y: 532 },
      ankle_left: { x: 173, y: 598 },
      ankle_right: { x: 227, y: 598 },
      foot_left: { x: 170, y: 635 },
      foot_right: { x: 230, y: 635 },
    },
    back: {
      neck_back: { x: 200, y: 99 },
      cervical_spine: { x: 200, y: 126 },
      shoulder_left: { x: 130, y: 126 },
      shoulder_right: { x: 270, y: 126 },
      thoracic_spine_upper: { x: 200, y: 166 },
      upper_arm_left_back: { x: 103, y: 170 },
      upper_arm_right_back: { x: 299, y: 170 },
      thoracic_spine_lower: { x: 200, y: 219 },
      elbow_left: { x: 97, y: 210 },
      elbow_right: { x: 303, y: 210 },
      lumbar_spine: { x: 200, y: 269 },
      forearm_left: { x: 89, y: 253 },
      forearm_right: { x: 313, y: 253 },
      wrist_hand_left: { x: 80, y: 310 },
      wrist_hand_right: { x: 320, y: 310 },
      sacrum: { x: 200, y: 309 },
      gluteal_left: { x: 170, y: 330 },
      gluteal_right: { x: 230, y: 330 },
      thigh_left_back: { x: 173, y: 400 },
      thigh_right_back: { x: 227, y: 400 },
      knee_left_back: { x: 173, y: 468 },
      knee_right_back: { x: 227, y: 468 },
      calf_left: { x: 173, y: 532 },
      calf_right: { x: 227, y: 532 },
      ankle_left: { x: 173, y: 598 },
      ankle_right: { x: 227, y: 598 },
      foot_left: { x: 170, y: 635 },
      foot_right: { x: 230, y: 635 },
    },
  };
  return centers[view]?.[regionId] ?? null;
}
