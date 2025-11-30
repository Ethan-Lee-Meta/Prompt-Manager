import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Entity, GraphNode, GraphLink } from '../types';

interface NetworkGraphProps {
  data: Entity[];
  activeId?: string;
  onNodeClick: (id: string) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ data, activeId, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Filter nodes: if activeId is present, only show it and its neighbors (and their neighbors)
    // For now, let's show the whole graph but highlight the active path
    
    const width = svgRef.current.clientWidth;
    const height = 500;

    const nodes: GraphNode[] = data.map(d => ({
      id: d.id,
      group: d.type === 'project' ? 1 : d.type === 'character' ? 2 : 3,
      label: d.title,
      type: d.type
    }));

    const links: GraphLink[] = [];
    data.forEach(source => {
      source.relatedIds.forEach(targetId => {
        // Ensure unique links and only link if target exists in current dataset
        if (data.find(d => d.id === targetId)) {
            // Avoid duplicate links (A-B and B-A)
            const exists = links.find(l => 
                (l.source === source.id && l.target === targetId) || 
                (l.source === targetId && l.target === source.id)
            );
            if (!exists) {
                links.push({ source: source.id, target: targetId, value: 1 });
            }
        }
      });
    });

    const colorMap: Record<string, string> = {
      project: '#a855f7', // Purple
      character: '#ef4444', // Red
      image: '#3b82f6', // Blue
      video: '#10b981', // Emerald
      prompt: '#f59e0b', // Amber
      tool: '#64748b' // Slate
    };

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2);

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", (d) => colorMap[d.type] || '#ccc')
      .attr("cursor", "pointer")
      .on("click", (event, d) => onNodeClick(d.id));
      
    // Add simple tooltips (labels)
    const text = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .text(d => d.label)
        .attr("x", 12)
        .attr("y", 4)
        .attr("fill", "#cbd5e1")
        .attr("font-size", "10px")
        .attr("pointer-events", "none");

    node.append("title").text(d => d.label);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      text
        .attr("x", (d: any) => d.x + 12)
        .attr("y", (d: any) => d.y + 4);
    });
    
    // Highlight Active
    if (activeId) {
        node.attr("stroke", (d) => d.id === activeId ? "#facc15" : "#fff")
            .attr("stroke-width", (d) => d.id === activeId ? 3 : 1.5)
            .attr("r", (d) => d.id === activeId ? 15 : 10);
    }

  }, [data, activeId, onNodeClick]);

  return (
    <div className="w-full h-[500px] bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-inner">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default NetworkGraph;
