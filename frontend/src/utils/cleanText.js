/**
 * Clean markdown/LaTeX formatting for display
 */
export function cleanText(text) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove backticks
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remove **bold** markers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Remove *italic* markers
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  
  // Remove ~~strikethrough~~
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');
  
  // Clean remaining
  cleaned = cleaned.replace(/\*\*/g, '');
  cleaned = cleaned.replace(/`/g, '');
  
  return cleaned.trim();
}
