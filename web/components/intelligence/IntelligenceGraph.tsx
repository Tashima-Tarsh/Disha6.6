"use client";

import cytoscape, { type Core } from "cytoscape";
import { useEffect, useRef } from "react";

import type { WorkspaceEdge, WorkspaceEntity } from "@/lib/intelligence/workspace-contract";
import styles from "./intelligence-graph.module.css";

export function IntelligenceGraph({
  entities,
  edges,
  selectedEntityId,
  onSelectEntity,
}: {
  entities: WorkspaceEntity[];
  edges: WorkspaceEdge[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelectEntity);

  useEffect(() => {
    onSelectRef.current = onSelectEntity;
  }, [onSelectEntity]);

  useEffect(() => {
    if (!containerRef.current || !entities.length) return;
    const allowed = new Set(entities.map((entity) => entity.entityId));
    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...entities.map((entity) => ({
          data: { id: entity.entityId, label: entity.displayName, type: entity.entityType },
        })),
        ...edges.filter((edge) => allowed.has(edge.fromEntityId) && allowed.has(edge.toEntityId)).map((edge) => ({
          data: {
            id: edge.edgeId,
            source: edge.fromEntityId,
            target: edge.toEntityId,
            label: edge.relationType,
            confidence: edge.confidence,
          },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#172535",
            "border-color": "#39c7d7",
            "border-width": 1.5,
            color: "#dce7f0",
            label: "data(label)",
            "font-size": 9,
            "font-family": "monospace",
            "text-wrap": "ellipsis",
            "text-max-width": "90px",
            "text-valign": "bottom",
            "text-margin-y": 6,
            width: 20,
            height: 20,
          },
        },
        {
          selector: "node[type = 'threat']",
          style: {
            "background-color": "#441820",
            "border-color": "#c64a56",
            "border-width": 2,
          },
        },
        {
          selector: "node[type = 'evidence']",
          style: {
            "background-color": "#3a2e18",
            "border-color": "#d5a75b",
            "border-width": 2,
          },
        },
        {
          selector: "node:selected",
          style: {
            "background-color": "#39c7d7",
            "border-color": "#ffffff",
            "border-width": 2.5,
            width: 26,
            height: 26,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.2,
            "line-color": "#24384d",
            "target-arrow-color": "#39c7d7",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            opacity: 0.75,
          },
        },
      ],
      layout: { name: "breadthfirst", directed: true, spacingFactor: 1.35, padding: 24 },
      minZoom: 0.35,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
    });
    cyRef.current = cy;
    cy.on("tap", "node", (event) => onSelectRef.current(event.target.id()));
    return () => { cyRef.current = null; cy.destroy(); };
  }, [entities, edges]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (!selectedEntityId) return;
    const node = cy.$id(selectedEntityId);
    if (node.nonempty()) {
      node.select();
      cy.animate({ center: { eles: node }, duration: 260 });
    }
  }, [selectedEntityId]);

  return <div className={styles.container} ref={containerRef} />;
}
