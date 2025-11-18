// Type definitions for renderer process
// Actual implementation is in src/main/modules/autoBmScript.ts

export const BM_RATE_LIMIT_PER_ROUND = 2 as const;

export type TaskResultStatus = 'pending' | 'running' | 'success' | 'error';

export interface TaskResult {
  id: string;
  viaUid: string;
  bmUid: string;
  inviteLink: string;
  viaBmId?: string;          // business_id của BM trên VIA (Via-BM-ID)
  viaAdAccountUid?: string;  // UID ad account lấy được từ VIA
  status: TaskResultStatus;
  errorMessage?: string;
  timestamp: number;
}
