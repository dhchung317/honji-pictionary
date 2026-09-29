export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  color: string;
  width: number;
  points: Point[];
}
