export interface LayoutBlock {
  id: string;
  name: string;
  shape: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  borderColor: string;
  strokeWidth: number;
  labelX: number;
  labelY: number;
  rotate?: number;
  materialCode?: string;
  materialName?: string;
  quantity?: number;
  status?: string;
}