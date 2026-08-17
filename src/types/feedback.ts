export type FeedbackType = 'bug' | 'visual' | 'suggestion' | 'performance';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'archived';

export interface TargetElementInfo {
  selector: string;
  tagName: string;
  textSnippet: string;
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
