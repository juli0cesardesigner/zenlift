export type FeedbackType = 'bug' | 'visual' | 'suggestion' | 'performance';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'archived';

export interface CodeLocationInfo {
  componentName?: string;
  componentStack?: string[]; // e.g. ["DesktopPlanEditor", "WorkoutTemplateCard", "Button"]
  fileName?: string; // e.g. "src/components/features/PlanBuilder/DesktopPlanEditor.tsx"
  lineNumber?: number; // e.g. 142
  columnNumber?: number; // e.g. 15
  propsSnippet?: Record<string, string | number | boolean>; // e.g. { exerciseId: "ex_1", title: "Supino" }
}

export interface DOMNodeLayer {
  level: number; // 0 = exact clicked, 1 = parent, 2 = grandparent...
  tagName: string;
  selector: string;
  label: string; // e.g. "<input> - [Nome do Atleta 1]" ou "<div> - [Card da Dupla]"
  textSnippet: string;
  componentName?: string;
  fileName?: string;
  boundingRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  domPath: string;
  xPercentage: number;
  yPercentage: number;
}

export interface TargetElementInfo {
  selector: string;
  tagName: string;
  textSnippet: string;
  iconName?: string; // e.g. "Trash2 (Lucide Icon)"
  closestContainerTitle?: string; // e.g. "Botão/Ação: Excluir Treino" ou "Seção: Treino A"
  parentComponent?: string; // e.g. "DesktopPlanEditor"
  codeLocation?: CodeLocationInfo;
  domPath?: string;
  attributes?: Record<string, string>;
  ancestors?: DOMNodeLayer[]; // Camadas hierárquicas para expansão de escopo
  xPercentage: number;
  yPercentage: number;
  scrollX: number;
  scrollY: number;
  boundingRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface DeviceInfo {
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
  language: string;
  theme?: string;
}

export interface AppFeedback {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  title: string;
  description: string;
  route: string;
  targetElement?: TargetElementInfo;
  deviceInfo: DeviceInfo;
  syncStatus?: 'synced' | 'local_only';
}
