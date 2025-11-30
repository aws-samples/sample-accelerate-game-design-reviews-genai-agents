/**
 * Utility functions for formatting message content
 */

/**
 * Parses escape sequences in message content
 * Converts literal \n and \t strings to actual newlines and tabs
 */
export const parseMessageContent = (content: string): string => {
  if (!content) return content;
  
  let parsed = content
    // Replace literal \n with actual newlines
    .replace(/\\n/g, '\n')
    // Replace literal \t with actual tabs (or spaces for better display)
    .replace(/\\t/g, '  ')
    // Replace literal \r (carriage return) if present
    .replace(/\\r/g, '')
    // Handle other common escape sequences if needed
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
  
  // Remove leading and trailing quotes if they exist
  parsed = parsed.trim();
  if ((parsed.startsWith('"') && parsed.endsWith('"')) || 
      (parsed.startsWith("'") && parsed.endsWith("'"))) {
    parsed = parsed.slice(1, -1);
  }
  
  return parsed;
};

/**
 * Formats message content for display with proper line breaks and spacing
 */
export const formatMessageForDisplay = (content: string): string => {
  // First parse escape sequences
  const parsed = parseMessageContent(content);
  
  // Trim excessive whitespace while preserving intentional formatting
  return parsed
    .split('\n')
    .map(line => line.trimEnd()) // Remove trailing spaces from each line
    .join('\n')
    .replace(/\n{3,}/g, '\n\n'); // Replace 3+ consecutive newlines with 2
};

/**
 * Checks if content contains markdown-style formatting
 */
export const hasMarkdownFormatting = (content: string): boolean => {
  const markdownPatterns = [
    /\*\*.*?\*\*/,  // Bold
    /\*.*?\*/,      // Italic
    /`.*?`/,        // Code
    /^#{1,6}\s/m,   // Headers
    /^\s*[-*+]\s/m, // Lists
    /^\s*\d+\.\s/m, // Numbered lists
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
};
