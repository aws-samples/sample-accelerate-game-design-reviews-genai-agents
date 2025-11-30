import type { Project, AgentSession, SessionSummary } from '../types/graphql';

export interface ExportData {
  project: {
    name: string;
    description?: string | undefined;
    createdAt: string;
  };
  session?: {
    id: string;
    startedAt: string;
    endedAt?: string | undefined;
    duration: string;
  };
  sessions?: Array<{
    id: string;
    startedAt: string;
    endedAt?: string | undefined;
    duration: string;
    summary: SessionSummary;
  }>;
  summary?: SessionSummary;
  exportedAt: string;
}

export const calculateSessionDuration = (startedAt: string, endedAt?: string): string => {
  if (!endedAt) return 'In progress';
  
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

export const exportSessionSummaryAsJSON = (project: Project, session: AgentSession): void => {
  if (!session.summary) {
    throw new Error('No summary available for this session');
  }

  const exportData: ExportData = {
    project: {
      name: project.name,
      description: project.description || undefined,
      createdAt: project.createdAt
    },
    session: {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt || undefined,
      duration: calculateSessionDuration(session.startedAt, session.endedAt || undefined)
    },
    summary: session.summary,
    exportedAt: new Date().toISOString()
  };

  downloadAsJSON(exportData, `${sanitizeFilename(project.name)}_session_${session.id.slice(-6)}_summary.json`);
};

export const exportAllSessionSummariesAsJSON = (project: Project, sessions: AgentSession[]): void => {
  const sessionsWithSummaries = sessions.filter(session => session.summary);
  
  if (sessionsWithSummaries.length === 0) {
    throw new Error('No completed sessions with summaries available');
  }

  const exportData: ExportData = {
    project: {
      name: project.name,
      description: project.description || undefined,
      createdAt: project.createdAt
    },
    sessions: sessionsWithSummaries.map(session => ({
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt || undefined,
      duration: calculateSessionDuration(session.startedAt, session.endedAt || undefined),
      summary: session.summary!
    })),
    exportedAt: new Date().toISOString()
  };

  downloadAsJSON(exportData, `${sanitizeFilename(project.name)}_all_summaries.json`);
};

export const exportSessionSummaryAsMarkdown = (project: Project, session: AgentSession): void => {
  if (!session.summary) {
    throw new Error('No summary available for this session');
  }

  const summary = session.summary;
  const duration = calculateSessionDuration(session.startedAt, session.endedAt || undefined);
  
  let markdown = `# Analysis Summary\n\n`;
  markdown += `**Project:** ${project.name}\n`;
  if (project.description) {
    markdown += `**Description:** ${project.description}\n`;
  }
  markdown += `**Session ID:** ${session.id}\n`;
  markdown += `**Started:** ${new Date(session.startedAt).toLocaleString()}\n`;
  if (session.endedAt) {
    markdown += `**Ended:** ${new Date(session.endedAt).toLocaleString()}\n`;
  }
  markdown += `**Duration:** ${duration}\n`;
  markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`;

  if (summary.findings && summary.findings.length > 0) {
    markdown += `## Key Findings\n\n`;
    summary.findings.forEach((finding, index) => {
      if (finding) {
        markdown += `${index + 1}. ${finding}\n`;
      }
    });
    markdown += `\n`;
  }

  if (summary.recommendations && summary.recommendations.length > 0) {
    markdown += `## Recommendations\n\n`;
    summary.recommendations.forEach((recommendation, index) => {
      if (recommendation) {
        markdown += `${index + 1}. ${recommendation}\n`;
      }
    });
    markdown += `\n`;
  }

  if (summary.keyInsights && summary.keyInsights.length > 0) {
    markdown += `## Key Insights\n\n`;
    summary.keyInsights.forEach((insight) => {
      if (insight) {
        markdown += `- ${insight}\n`;
      }
    });
    markdown += `\n`;
  }

  if (summary.conversationHighlights && summary.conversationHighlights.length > 0) {
    markdown += `## Conversation Highlights\n\n`;
    summary.conversationHighlights.forEach((highlight) => {
      if (highlight) {
        markdown += `> ${highlight}\n\n`;
      }
    });
  }

  downloadAsText(markdown, `${sanitizeFilename(project.name)}_session_${session.id.slice(-6)}_summary.md`);
};

export const exportSessionSummaryAsCSV = (project: Project, sessions: AgentSession[]): void => {
  const sessionsWithSummaries = sessions.filter(session => session.summary);
  
  if (sessionsWithSummaries.length === 0) {
    throw new Error('No completed sessions with summaries available');
  }

  let csv = 'Project Name,Session ID,Started At,Ended At,Duration,Findings Count,Recommendations Count,Key Insights Count,Top Finding,Top Recommendation\n';
  
  sessionsWithSummaries.forEach(session => {
    const summary = session.summary!;
    const duration = calculateSessionDuration(session.startedAt, session.endedAt || undefined);
    const topFinding = summary.findings && summary.findings.length > 0 ? summary.findings[0] : '';
    const topRecommendation = summary.recommendations && summary.recommendations.length > 0 ? summary.recommendations[0] : '';
    
    csv += `"${project.name}","${session.id}","${session.startedAt}","${session.endedAt || ''}","${duration}",`;
    csv += `"${summary.findings?.length || 0}","${summary.recommendations?.length || 0}","${summary.keyInsights?.length || 0}",`;
    csv += `"${escapeCSV(topFinding || '')}","${escapeCSV(topRecommendation || '')}"\n`;
  });

  downloadAsText(csv, `${sanitizeFilename(project.name)}_sessions_summary.csv`);
};

// Helper functions
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

const escapeCSV = (text: string): string => {
  return text.replace(/"/g, '""');
};

const downloadAsJSON = (data: any, filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, filename);
};

const downloadAsText = (text: string, filename: string): void => {
  const blob = new Blob([text], { type: 'text/plain' });
  downloadBlob(blob, filename);
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getExportFormats = () => [
  { value: 'json', label: 'JSON', description: 'Structured data format' },
  { value: 'markdown', label: 'Markdown', description: 'Human-readable format' },
  { value: 'csv', label: 'CSV', description: 'Spreadsheet format (sessions only)' }
];

export type ExportFormat = 'json' | 'markdown' | 'csv';