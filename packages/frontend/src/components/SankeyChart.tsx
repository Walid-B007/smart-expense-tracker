import { useEffect, useRef } from 'react';
import { sankey, sankeyLinkHorizontal, SankeyGraph, SankeyNode, SankeyLink } from 'd3-sankey';

interface SankeyData {
  nodes: { name: string; color?: string }[];
  links: { source: number; target: number; value: number; color?: string }[];
}

interface SankeyChartProps {
  data: SankeyData;
  width?: number;
  height?: number;
  currency?: string;
}

export function SankeyChart({ data, width = 800, height = 400, currency = 'USD' }: SankeyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = svgRef.current;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    svg.innerHTML = '';

    // Create sankey generator
    const sankeyGenerator = sankey<SankeyNode<any, any>, SankeyLink<any, any>>()
      .nodeWidth(20)
      .nodePadding(20)
      .extent([
        [margin.left, margin.top],
        [innerWidth, innerHeight],
      ]);

    // Process data
    const graph: SankeyGraph<any, any> = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d })),
    });

    // Create main group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    // Draw links
    graph.links.forEach(link => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pathData = sankeyLinkHorizontal()(link);

      if (pathData) {
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', link.color || '#cbd5e1');
        path.setAttribute('stroke-width', String(Math.max(1, link.width || 0)));
        path.setAttribute('opacity', '0.5');
        path.style.transition = 'opacity 0.3s';

        // Add hover effect
        path.addEventListener('mouseenter', () => {
          path.setAttribute('opacity', '0.8');
        });
        path.addEventListener('mouseleave', () => {
          path.setAttribute('opacity', '0.5');
        });

        // Tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        const sourceName = typeof link.source === 'object' ? link.source.name : '';
        const targetName = typeof link.target === 'object' ? link.target.name : '';
        title.textContent = `${sourceName} → ${targetName}: ${link.value.toFixed(2)} ${currency}`;
        path.appendChild(title);

        g.appendChild(path);
      }
    });

    // Draw nodes
    graph.nodes.forEach(node => {
      // Node rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(node.x0 || 0));
      rect.setAttribute('y', String(node.y0 || 0));
      rect.setAttribute('width', String((node.x1 || 0) - (node.x0 || 0)));
      rect.setAttribute('height', String((node.y1 || 0) - (node.y0 || 0)));
      rect.setAttribute('fill', node.color || '#3b82f6');
      rect.setAttribute('rx', '4');
      rect.style.cursor = 'pointer';

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${node.name}: ${node.value?.toFixed(2)} ${currency}`;
      rect.appendChild(title);

      g.appendChild(rect);

      // Node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const x = (node.x0 || 0) < innerWidth / 2 ? (node.x1 || 0) + 6 : (node.x0 || 0) - 6;
      const y = ((node.y1 || 0) + (node.y0 || 0)) / 2;

      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y));
      text.setAttribute('dy', '0.35em');
      text.setAttribute('text-anchor', (node.x0 || 0) < innerWidth / 2 ? 'start' : 'end');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', '600');
      text.setAttribute('fill', '#374151');
      text.textContent = `${node.name} (${node.value?.toFixed(0)} ${currency})`;

      g.appendChild(text);
    });
  }, [data, width, height, currency]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
