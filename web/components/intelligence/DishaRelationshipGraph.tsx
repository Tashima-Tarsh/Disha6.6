"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  Handle,
  Position,
} from "@xyflow/react";
import {
  User,
  Building,
  Globe,
  Network,
  MapPin,
  Coins,
  MessageSquare,
  FileText,
  Camera,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Filter,
  Maximize2,
  Car,
} from "lucide-react";
import styles from "./disha-relationship-graph.module.css";

export type EntityType =
  | "person"
  | "organization"
  | "domain"
  | "ip"
  | "location"
  | "wallet"
  | "social"
  | "document"
  | "media"
  | "vehicle";

export interface GraphEntityNodeData {
  label: string;
  type: EntityType;
  details?: string;
  sourceName?: string;
  confidence?: number;
  verified?: boolean;
  evidenceCount?: number;
  [key: string]: unknown;
}

const ENTITY_ICONS: Record<EntityType, React.ElementType> = {
  person: User,
  organization: Building,
  domain: Globe,
  ip: Network,
  location: MapPin,
  wallet: Coins,
  social: MessageSquare,
  document: FileText,
  media: Camera,
  vehicle: Car,
};

const ENTITY_COLORS: Record<EntityType, { border: string; bg: string; text: string }> = {
  person: { border: "#246BFD", bg: "rgba(36, 107, 253, 0.08)", text: "#174EA6" },
  organization: { border: "#18C9F2", bg: "rgba(24, 201, 242, 0.08)", text: "#0E7490" },
  domain: { border: "#8861FF", bg: "rgba(136, 97, 255, 0.08)", text: "#6D28D9" },
  ip: { border: "#FF9933", bg: "rgba(255, 153, 51, 0.08)", text: "#C2410C" },
  location: { border: "#138F55", bg: "rgba(19, 143, 85, 0.08)", text: "#047857" },
  wallet: { border: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)", text: "#B45309" },
  social: { border: "#EC4899", bg: "rgba(236, 72, 153, 0.08)", text: "#BE185D" },
  document: { border: "#64748B", bg: "rgba(100, 116, 139, 0.08)", text: "#334155" },
  media: { border: "#6366F1", bg: "rgba(99, 102, 241, 0.08)", text: "#4338CA" },
  vehicle: { border: "#0284C7", bg: "rgba(2, 132, 199, 0.08)", text: "#0369A1" },
};

function CustomEntityNode({ data, selected }: { data: GraphEntityNodeData; selected?: boolean }) {
  const Icon = ENTITY_ICONS[data.type] || Globe;
  const colors = ENTITY_COLORS[data.type] || ENTITY_COLORS.domain;

  return (
    <div
      className={`${styles.customNode} ${selected ? styles.nodeSelected : ""}`}
      style={{ borderColor: selected ? "var(--primary-blue)" : colors.border }}
    >
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <div className={styles.iconCircle} style={{ background: colors.bg, color: colors.text }}>
          <Icon size={14} />
        </div>
        <div className={styles.nodeMeta}>
          <span className={styles.nodeType} style={{ color: colors.text }}>
            {data.type.toUpperCase()}
          </span>
          <span className={styles.nodeLabel} title={data.label}>
            {data.label}
          </span>
        </div>
      </div>
      {data.details && <div className={styles.nodeDetails}>{data.details}</div>}
      <div className={styles.nodeFooter}>
        {data.sourceName && (
          <span className={styles.sourceTag}>
            <ExternalLink size={9} /> {data.sourceName}
          </span>
        )}
        {data.verified && (
          <span className={styles.verifiedTag}>
            <CheckCircle size={9} /> Verified
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

const nodeTypes = {
  entityNode: CustomEntityNode,
};

interface DishaRelationshipGraphProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSelectNode?: (nodeId: string, data: GraphEntityNodeData) => void;
  className?: string;
}

export function DishaRelationshipGraph({
  initialNodes,
  initialEdges,
  onSelectNode,
  className = "",
}: DishaRelationshipGraphProps) {
  // Default illustrative evidence-backed nodes if none supplied
  const defaultNodes: Node[] = useMemo(
    () => [
      {
        id: "target-1",
        type: "entityNode",
        position: { x: 300, y: 120 },
        data: {
          label: "Primary Subject / Entity",
          type: "person",
          details: "Verified identity vector anchored in Section 63 BSA evidence ledger",
          sourceName: "National Registers",
          verified: true,
          evidenceCount: 4,
        },
      },
      {
        id: "target-org",
        type: "entityNode",
        position: { x: 100, y: 280 },
        data: {
          label: "Corporate Affiliation",
          type: "organization",
          details: "Active director filing & registered corporate entity",
          sourceName: "MCA Registry",
          verified: true,
        },
      },
      {
        id: "target-domain",
        type: "entityNode",
        position: { x: 500, y: 280 },
        data: {
          label: "Primary Infrastructure Domain",
          type: "domain",
          details: "Associated registrar contact with matching WHOIS provenance",
          sourceName: "Passive DNS / WHOIS",
          verified: true,
        },
      },
      {
        id: "target-ip",
        type: "entityNode",
        position: { x: 520, y: 440 },
        data: {
          label: "203.0.113.19 (Hosting BGP)",
          type: "ip",
          details: "Autonomous System AS45102 Routing Node",
          sourceName: "Shodan Telemetry",
          verified: true,
        },
      },
      {
        id: "target-vehicle",
        type: "entityNode",
        position: { x: 120, y: 440 },
        data: {
          label: "DL01AB1234 (Transport Reg)",
          type: "vehicle",
          details: "Mall Road RTO Civil Lines Transport Record",
          sourceName: "Public RTO Reference",
          verified: true,
        },
      },
    ],
    []
  );

  const defaultEdges: Edge[] = useMemo(
    () => [
      {
        id: "e1-2",
        source: "target-1",
        target: "target-org",
        label: "director_of",
        animated: true,
        style: { stroke: "#246BFD", strokeWidth: 2 },
      },
      {
        id: "e1-3",
        source: "target-1",
        target: "target-domain",
        label: "registrant_email",
        animated: true,
        style: { stroke: "#8861FF", strokeWidth: 2 },
      },
      {
        id: "e3-4",
        source: "target-domain",
        target: "target-ip",
        label: "resolves_to",
        animated: true,
        style: { stroke: "#FF9933", strokeWidth: 2 },
      },
      {
        id: "e1-5",
        source: "target-1",
        target: "target-vehicle",
        label: "registered_jurisdiction",
        animated: true,
        style: { stroke: "#138F55", strokeWidth: 2 },
      },
    ],
    []
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes || defaultNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges || defaultEdges);
  const [filterType, setFilterType] = useState<string>("all");

  const filteredNodes = useMemo(() => {
    if (filterType === "all") return nodes;
    return nodes.filter((n) => (n.data as unknown as GraphEntityNodeData)?.type === filterType);
  }, [nodes, filterType]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onSelectNode) {
        onSelectNode(node.id, node.data as unknown as GraphEntityNodeData);
      }
    },
    [onSelectNode]
  );

  return (
    <div className={`${styles.graphContainer} ${className}`}>
      {/* Control Toolbar */}
      <div className={styles.graphToolbar}>
        <div className={styles.toolbarTitle}>
          <ShieldCheck size={14} className={styles.shieldIcon} />
          <span>Interactive Relationship Graph // Real Corroborated Evidence</span>
        </div>
        <div className={styles.filterGroup}>
          <Filter size={12} className={styles.filterIcon} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter Graph Entities"
          >
            <option value="all">All Entity Types</option>
            <option value="person">Persons</option>
            <option value="organization">Organizations</option>
            <option value="domain">Domains</option>
            <option value="ip">IP / Networks</option>
            <option value="vehicle">Vehicles</option>
          </select>
        </div>
      </div>

      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        className={styles.flowViewport}
      >
        <Controls className={styles.flowControls} />
        <MiniMap
          nodeColor={(n) => {
            const t = (n.data as unknown as GraphEntityNodeData)?.type;
            return ENTITY_COLORS[t]?.border || "#246BFD";
          }}
          className={styles.flowMiniMap}
          maskColor="rgba(247, 249, 254, 0.7)"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#CBD5E1" />
      </ReactFlow>
    </div>
  );
}
