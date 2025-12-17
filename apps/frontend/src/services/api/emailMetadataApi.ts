import api from '@fe/lib/api/api';
import { KanbanStatus } from '../../features/mailbox/store/emailStore';

export interface EmailMetadataResponse {
  success: boolean;
  data: {
    id: string;
    userId: string;
    emailId: string;
    kanbanStatus: KanbanStatus;
    snoozeUntil: string | null;
    summary: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface GenerateSummaryResponse {
  success: boolean;
  data: {
    summary: string;
    metadata: {
      id: string;
      userId: string;
      emailId: string;
      kanbanStatus: KanbanStatus;
      snoozeUntil: string | null;
      summary: string | null;
      createdAt: string;
      updatedAt: string;
    };
  };
}

export const emailMetadataApi = {
  updateKanbanStatus: async (
    emailId: string,
    kanbanStatus: KanbanStatus
  ): Promise<EmailMetadataResponse> => {
    console.log('📡 [API] Calling updateKanbanStatus:', {
      emailId,
      kanbanStatus,
      url: `/email-metadata/${emailId}/kanban-status`,
    });
    try {
      const response = await api.put(
        `/email-metadata/${emailId}/kanban-status`,
        {
          kanbanStatus,
        }
      );
      console.log('✅ [API] updateKanbanStatus response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [API] updateKanbanStatus error:', error);
      throw error;
    }
  },

  snoozeEmail: async (
    emailId: string,
    snoozeUntil: Date
  ): Promise<EmailMetadataResponse> => {
    const response = await api.post(`/email-metadata/${emailId}/snooze`, {
      snoozeUntil: snoozeUntil.toISOString(),
    });
    return response.data;
  },

  unsnoozeEmail: async (emailId: string): Promise<EmailMetadataResponse> => {
    const response = await api.post(`/email-metadata/${emailId}/unsnooze`);
    return response.data;
  },

  generateSummary: async (
    emailId: string
  ): Promise<GenerateSummaryResponse> => {
    const response = await api.post(
      `/email-metadata/${emailId}/generate-summary`
    );
    return response.data;
  },

  getMetadata: async (emailId: string): Promise<EmailMetadataResponse> => {
    const response = await api.get(`/email-metadata/${emailId}`);
    return response.data;
  },
};
