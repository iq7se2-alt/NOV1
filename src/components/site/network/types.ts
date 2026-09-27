export type CharNode = {
  id: number;
  name: string;
  imageUrl: string | null;
  description: string | null;
  isMain: boolean;
  color: string | null;
  appearanceCount: number;
  mentionCount?: number;
  chapters: number[];
  factionId?: number | null;
};

export type RelationEdge = {
  id: number;
  fromId: number;
  toId: number;
  type: string;
  description: string | null;
};

export type Layout = {
  pos: Map<number, { x: number; y: number }>;
  factionOf: Map<number, number>; // charId → faction leader id
  protagonist: CharNode | null;
};
