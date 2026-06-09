/**
 * Utility to parse mathematical subscripts, superscripts, and fractions
 * and convert them into beautiful, structured, and horizontal HTML representations.
 * Specially optimized to render chemical equations, formulas, fractions, and brackets properly.
 */
export function renderFormattedMath(text: string | null | undefined): string {
  if (!text) return "";

  // 1. Convert unicode subscripts & superscripts into standard numbers first
  // to unify formatting regardless of the model variation
  const unicodeSubMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    '₊': '+', '₋': '-'
  };
  const unicodeSupMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁺': '+', '⁻': '-'
  };

  let normText = text;
  for (const [uni, norm] of Object.entries(unicodeSubMap)) {
    normText = normText.split(uni).join(`_${norm}`);
  }
  for (const [uni, norm] of Object.entries(unicodeSupMap)) {
    normText = normText.split(uni).join(`^${norm}`);
  }

  // 2. Escape basic HTML characters to prevent rendering problems,
  // but keep what we will safely generate internally.
  let html = normText
    .replace(/(\d)\s*\\+cdot\s*(\d)/g, "$1 &times; $2") // e.g. 5 \cdot 5 -> 5 × 5
    .replace(/\\+cdot\s*/g, "") // Remove the rest (e.g. between variables/letters so they display side-by-side: 2 \cdot a \cdot s -> 2as)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 3. LaTeX \text{} formatting: simplify it to just plain text
  html = html.replace(/\\text\{([^}]+)\}/g, "$1");

  // 4. Parse LaTeX fractions: \frac{numerator}{denominator}
  const fracRegex = /\\+frac\{([^}]+)\}\{([^}]+)\}/g;
  while (fracRegex.test(html)) {
    html = html.replace(fracRegex, (match, num, den) => {
      return `<span class="inline-flex flex-col text-center align-middle mx-1" style="vertical-align: -0.35rem;"><span class="border-b border-slate-600 pb-0.5 px-1 leading-none font-bold text-slate-800 font-mono" style="font-size: 11px;">${num}</span><span class="pt-0.5 px-1 leading-none font-bold text-slate-800 font-mono" style="font-size: 11px;">${den}</span></span>`;
    });
  }

  // 5. Auto-format standard inline fractional numbers e.g. 1/2, 3/4, 1/4 to clean display
  html = html.replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (match, num, den) => {
    return `<span class="inline-flex flex-col text-center align-middle mx-1" style="vertical-align: -0.35rem;"><span class="border-b border-slate-600 pb-0.5 px-1 leading-none font-bold text-slate-800 font-mono" style="font-size: 11px;">${num}</span><span class="pt-0.5 px-1 leading-none font-bold text-slate-800 font-mono" style="font-size: 11px;">${den}</span></span>`;
  });

  // 5.5. Auto-format slash division notation of math variables/letters/numbers e.g. a/b, 2x/3y, m_1/m_2
  html = html.replace(/\b([a-zA-Z0-9_{}\^+\-]+)\/([a-zA-Z0-9_{}\^+\-]+)\b/g, (match, num, den) => {
    if (match.includes("<") || match.includes(">") || match.includes("http") || match.includes("href") || match.includes("src")) {
      return match;
    }
    return `<span class="inline-flex flex-col text-center align-middle mx-1" style="vertical-align: -0.35rem;"><span class="border-b border-slate-600 pb-0.5 px-1 leading-none font-bold text-slate-800 font-mono" style="font-size: 11px;">${num}</span><span class="pt-0.5 px-1 leading-none font-bold text-slate-800 font-mono" style="font-size: 11px;">${den}</span></span>`;
  });

  // 6. Support LaTeX and standard math superscripts: ^{expression} or ^expression
  html = html.replace(/\^+\{([^}]+)\}/g, "<sup class='font-bold text-pink-600 mx-px' style='font-size: 9px;'>$1</sup>");
  // Simple ^x or ^2
  html = html.replace(/\^+([a-zA-Z0-9+-=]+)/g, "<sup class='font-bold text-pink-600 mx-px' style='font-size: 9px;'>$1</sup>");

  // 7. Support LaTeX and standard math subscripts: _{expression} or _expression
  html = html.replace(/_+\{([^}]+)\}/g, "<sub class='font-bold text-indigo-700 mx-px' style='font-size: 9px;'>$1</sub>");
  // Simple _1 or _n
  html = html.replace(/_+([a-zA-Z0-9+-=]+)/g, "<sub class='font-bold text-indigo-700 mx-px' style='font-size: 9px;'>$1</sub>");

  // 8. Auto-format standard chemical element formulas (e.g., H2O, CO2, H2SO4, C6H12O6, NaCl, CaCO3, Ca(OH)2)
  // Let's match elements followed directly by numbers, which are not already part of any HTML tag.
  const chemElements = "H|He|Li|Be|B|C|N|O|F|Ne|Na|Mg|Al|Si|P|S|Cl|Ar|K|Ca|Ti|V|Cr|Mn|Fe|Co|Ni|Cu|Zn|Br|Ag|I|Pt|Au|Hg|Pb|U";
  
  // Element + Number without a leading underscore (e.g., H2O -> H<sub>2</sub>O)
  const chemElemRegex = new RegExp(`\\b(${chemElements})(\\d+)\\b/g`);
  // Let's run a custom tokenizer replacement to apply subscript tag safely when element is immediately followed by a digit.
  // This supports element symbols followed directly by a number, even when adjacent to other chemical symbols (e.g. H2SO4)
  const symbolsArray = chemElements.split("|");
  for (const el of symbolsArray) {
    // Regex for: element immediately followed by digits, but not already in a tag
    const elDigRegex = new RegExp(`\\b(${el})(\\d+)(?=[A-Z]|\\(|\\)|\\+|-|\\s|\\b|$)`, "g");
    html = html.replace(elDigRegex, "$1<sub class='font-black text-indigo-700 mx-px' style='font-size: 9px;'>$2</sub>");
  }

  // Also catch double elements and brackets followed by coefficients: (OH)2, (SO4)3
  html = html.replace(/(\))(\d+)(?=[A-Z]|\\|\(|\)|\\|\+|-|\\s|\\b|$)/g, "$1<sub class='font-black text-indigo-700 mx-px' style='font-size: 9px;'>$2</sub>");

  // 9. Standard chemical reactions: arrows (-->, ->, =>, &rarr;)
  html = html.replace(/\s*(--&gt;|-&gt;|=&gt;|&rarr;)\s*/g, " <span class='text-emerald-600 font-extrabold mx-2 text-sm'>&rarr;</span> ");

  // 10. Auto-format common ions/charges (e.g., Na+, Cl-, Mg2+, OH-, SO42-)
  // If we see a element/number followed immediately by + or - or 2+ (excluding inside tags), format as superscript
  const commonIons = ["Na\\+", "Cl\\-", "Mg2\\+", "Ca2\\+", "OH\\-", "SO42\\-", "CO32\\-", "NH4\\+", "H\\+", "O2\\-", "Fe2\\+", "Fe3\\+"];
  for (const ion of commonIons) {
    const rawIon = ion.replace(/\\/g, ""); // "Na+"
    const elementPart = rawIon.slice(0, -1); // "Na"
    const chargePart = rawIon.slice(-1); // "+"
    const ionRegex = new RegExp(`\\b${ion}\\b`, "g");
    html = html.replace(ionRegex, `${elementPart}<sup class='font-bold text-pink-600 mx-px' style='font-size: 9px;'>${chargePart}</sup>`);
  }

  // 11. Beautify brackets [ ] ( ) { } in mathematical contexts safely without mutating generated HTML attributes
  html = html.replace(/(<[^>]+>)|([\(\)\[\]\{\}])/g, (match, tag, bracket) => {
    if (tag) {
      return tag; // Return tag completely unchanged
    }
    return `<span class='font-bold text-slate-800 font-sans mx-1'>${bracket}</span>`;
  });

  // 12. Convert newlines to native HTML breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}
