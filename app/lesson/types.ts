export type AssetKind = 'VIDEO' | 'IMAGE' | 'PDF' | 'LINK' | 'HTML';

export type AssetItem = {
  id: number;
  type: AssetKind;
  title: string;
  url?: string | null;
  htmlContent?: string | null;
  order: number;
  isRequired: boolean;
  completed: boolean;
  isNew?: boolean;
  questionCount?: number;
  durationSec?: number | null;
  thumbnailUrl?: string | null;
};

export type LessonAssetsResponse = {
  assignmentId: number;
  topic?: { id: number; code: string; title: string } | null;
  assets: AssetItem[];
  newCount?: number;
};
