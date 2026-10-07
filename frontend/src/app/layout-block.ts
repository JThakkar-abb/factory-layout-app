export interface LayoutBlock {
  id: string;
  name: string;

  // Shape
  shape: 'rect';

  // Position & size
  x: number;
  y: number;
  width: number;
  height: number;

  // Styling
  fillColor: string;
  borderColor: string;
  strokeWidth: number;

  // Label
  labelX: number;
  labelY: number;
  rotate?: number;

  // Material Info (for future use)
  materialCode?: string;
  materialName?: string;
  quantity?: number;
  status?: string;
}