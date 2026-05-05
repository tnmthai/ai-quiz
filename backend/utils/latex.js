/**
 * Convert LaTeX math expressions to readable Unicode math text
 * Handles common patterns from Gemini AI output
 */

const SUPERSCRIPTS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾', '=': '⁼', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ' };
const SUBSCRIPTS = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '(': '₍', ')': '₎', 'a': 'ₐ', 'b': 'ᵦ', 'c': '𝒸', 'd': '𝘥', 'e': 'ₑ', 'f': '𝒻', 'g': '𝓰', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'q': '𝓆', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ' };

function toSuperscript(str) {
  return str.split('').map(c => SUPERSCRIPTS[c] || c).join('');
}

function toSubscript(str) {
  return str.split('').map(c => SUBSCRIPTS[c] || c).join('');
}

// Extract balanced braces content
function extractBraces(str, start) {
  if (str[start] !== '{') return { content: str[start], end: start };
  let depth = 1, i = start + 1;
  while (i < str.length && depth > 0) {
    if (str[i] === '{') depth++;
    if (str[i] === '}') depth--;
    i++;
  }
  return { content: str.slice(start + 1, i - 1), end: i - 1 };
}

function latexToText(latex) {
  if (!latex) return '';
  
  let result = latex;
  
  // Remove $ delimiters
  result = result.replace(/\$\$/g, '');
  result = result.replace(/\$/g, '');
  
  // Common commands mapping
  const commands = {
    '\\times': '×', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
    '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
    '\\infty': '∞', '\\pi': 'π', '\\theta': 'θ', '\\alpha': 'α',
    '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\sigma': 'σ',
    '\\lambda': 'λ', '\\mu': 'μ', '\\omega': 'ω', '\\phi': 'φ',
    '\\cdot': '·', '\\ldots': '…', '\\cdots': '⋯',
    '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒',
    '\\sum': 'Σ', '\\prod': 'Π',
    '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\cup': '∪', '\\cap': '∩',
    '\\int': '∫',
    '\\forall': '∀', '\\exists': '∃', '\\emptyset': '∅',
    '\\partial': '∂', '\\nabla': '∇',
    '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan',
    '\\log': 'log', '\\ln': 'ln', '\\lim': 'lim',
    '\\quad': ' ', '\\qquad': '  ', '\\,': ' ', '\\;': ' ',
    '\\text{': '', '\\mathrm{': '', '\\mathbf{': '',
    '\\left': '', '\\right': '', '\\Big': '', '\\big': '',
    '\\displaystyle': '', '\\textstyle': '',
  };
  
  // Replace simple commands (longer first to avoid partial matches)
  const sortedCommands = Object.entries(commands).sort((a, b) => b[0].length - a[0].length);
  for (const [cmd, replacement] of sortedCommands) {
    result = result.split(cmd).join(replacement);
  }
  
  // Handle \frac{a}{b} → (a)/(b)
  while (result.includes('\\frac')) {
    const idx = result.indexOf('\\frac');
    const after = result.slice(idx + 5);
    const num = extractBraces(after, 0);
    const den = extractBraces(after, num.end + 1);
    
    const numText = latexToText(num.content);
    const denText = latexToText(den.content);
    
    // Simple fractions use Unicode: a/b
    // Complex fractions use (num)/(den)
    const needsParens = numText.length > 1 || denText.length > 1;
    const fracStr = needsParens 
      ? `(${numText})/(${denText})`
      : `${numText}/${denText}`;
    
    result = result.slice(0, idx) + fracStr + after.slice(den.end + 1);
  }
  
  // Handle \sqrt{x} → √(x) or √x
  while (result.includes('\\sqrt')) {
    const idx = result.indexOf('\\sqrt');
    const after = result.slice(idx + 5);
    
    // Check for optional index: \sqrt[n]{x}
    let content, endPos;
    if (after[0] === '[') {
      // Has index
      const closeIdx = after.indexOf(']');
      const index = after.slice(1, closeIdx);
      const braces = extractBraces(after, closeIdx + 1);
      content = `${toSubscript(index)}√(${latexToText(braces.content)})`;
      endPos = braces.end;
    } else if (after[0] === '{') {
      const braces = extractBraces(after, 0);
      const inner = latexToText(braces.content);
      content = inner.length > 1 ? `√(${inner})` : `√${inner}`;
      endPos = braces.end;
    } else {
      content = '√';
      endPos = -1;
    }
    
    result = result.slice(0, idx) + content + after.slice(endPos + 1);
  }
  
  // Handle x^{n} → xⁿ
  while (result.includes('^{')) {
    const idx = result.indexOf('^{');
    const braces = extractBraces(result, idx + 1);
    const sup = toSuperscript(latexToText(braces.content));
    result = result.slice(0, idx) + sup + result.slice(braces.end + 1);
  }
  
  // Handle x_{n} → xₙ
  while (result.includes('_{')) {
    const idx = result.indexOf('_{');
    const braces = extractBraces(result, idx + 1);
    const sub = toSubscript(latexToText(braces.content));
    result = result.slice(0, idx) + sub + result.slice(braces.end + 1);
  }
  
  // Handle simple ^n (single char)
  result = result.replace(/\^([a-z0-9])/g, (_, ch) => toSuperscript(ch));
  
  // Handle simple _n (single char)
  result = result.replace(/_([a-z0-9])/g, (_, ch) => toSubscript(ch));
  
  // Handle \int → ∫ with limits
  result = result.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, (_, a, b) => `∫(${a}→${b})`);
  result = result.replace(/\\int_\{([^}]+)\}/g, (_, a) => `∫${toSubscript(a)}`);
  result = result.replace(/\\int/g, '∫');
  
  // Handle \sum_{i=1}^{n} → Σ(i=1→n)
  result = result.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, (_, a, b) => `Σ(${a}→${b})`);
  result = result.replace(/\\sum/g, 'Σ');
  
  // Handle \lim_{x \to a} → lim(x→a)
  result = result.replace(/lim_\{([^}]+)\\to\s*([^}]+)\}/g, 'lim($1→$2)');
  
  // Handle remaining braces (just remove them)
  result = result.replace(/\{/g, '').replace(/\}/g, '');
  
  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

module.exports = { latexToText };
