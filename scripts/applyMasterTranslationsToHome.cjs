const fs = require('fs');
const path = require('path');

const homePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'Home.tsx');
let src = fs.readFileSync(homePath, 'utf8');

const te = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'locales', 'te.json'), 'utf8'));

// 1. Ensure FarmerProfileDropdown has useLanguage
if (!src.includes('const { language } = useLanguage();\n  const [open, setOpen] = useState(false);')) {
  src = src.replace(
    'function FarmerProfileDropdown({\n  profileRecord,\n  onViewProfile,\n  onLogout,\n}: {\n  profileRecord?: { name: string; farmerCode?: string; phone?: string; village?: string; status?: string } | null;\n  onViewProfile: () => void;\n  onLogout: () => void;\n}) {\n  const [open, setOpen] = useState(false);',
    'function FarmerProfileDropdown({\n  profileRecord,\n  onViewProfile,\n  onLogout,\n}: {\n  profileRecord?: { name: string; farmerCode?: string; phone?: string; village?: string; status?: string } | null;\n  onViewProfile: () => void;\n  onLogout: () => void;\n}) {\n  const { language } = useLanguage();\n  const [open, setOpen] = useState(false);'
  );
}

// 2. SectionTitle automatic localization
src = src.replace(
  'function SectionTitle({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: React.ReactNode }) {\n  return (\n    <div className="section-heading">\n      <div>\n        {eyebrow && <p className="eyebrow">{eyebrow}</p>}\n        <h1>{title}</h1>\n        {body && <p className="section-body">{body}</p>}\n      </div>',
  'function SectionTitle({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: React.ReactNode }) {\n  const { language } = useLanguage();\n  return (\n    <div className="section-heading">\n      <div>\n        {eyebrow && <p className="eyebrow">{typeof eyebrow === "string" ? tUi(eyebrow, language) : eyebrow}</p>}\n        <h1>{typeof title === "string" ? tUi(title, language) : title}</h1>\n        {body && <p className="section-body">{typeof body === "string" ? tUi(body, language) : body}</p>}\n      </div>'
);

// 3. MetricCard automatic localization
src = src.replace(
  'function MetricCard({ label, value, hint, icon: Icon, tone = "green" }: { label: string; value: string; hint: string; icon: typeof Ticket; tone?: "green" | "blue" | "yellow" }) {\n  return <article className={`metric-card ${tone}`}><span className="metric-icon"><Icon size={20} /></span><p>{label}</p><strong>{value}</strong><small>{hint}</small></article>;\n}',
  'function MetricCard({ label, value, hint, icon: Icon, tone = "green" }: { label: string; value: string; hint: string; icon: typeof Ticket; tone?: "green" | "blue" | "yellow" }) {\n  const { language } = useLanguage();\n  return <article className={`metric-card ${tone}`}><span className="metric-icon"><Icon size={20} /></span><p>{typeof label === "string" ? tUi(label, language) : label}</p><strong>{value}</strong><small>{typeof hint === "string" ? tUi(hint, language) : hint}</small></article>;\n}'
);

// 4. Pill automatic localization
src = src.replace(
  'function Pill({ children, kind = "green" }: { children: React.ReactNode; kind?: "green" | "blue" | "yellow" | "gray" }) {\n  return <span className={`status-pill status-${kind}`}>{children}</span>;\n}',
  'function Pill({ children, kind = "green" }: { children: React.ReactNode; kind?: "green" | "blue" | "yellow" | "gray" }) {\n  const { language } = useLanguage();\n  return <span className={`status-pill status-${kind}`}>{typeof children === "string" ? tUi(children, language) : children}</span>;\n}'
);

// 5. ActionButton automatic localization
src = src.replace(
  'function ActionButton({ children, onClick, secondary = false, icon: Icon, disabled = false, className = "" }: { children: React.ReactNode; onClick: () => void; secondary?: boolean; icon?: typeof ArrowRight; disabled?: boolean; className?: string }) {\n  return (\n    <button type="button" className={`action-btn ${secondary ? "secondary" : "primary"} ${className}`} onClick={onClick} disabled={disabled}>\n      <span>{children}</span>\n      {Icon && <Icon size={16} />}\n    </button>\n  );\n}',
  'function ActionButton({ children, onClick, secondary = false, icon: Icon, disabled = false, className = "" }: { children: React.ReactNode; onClick: () => void; secondary?: boolean; icon?: typeof ArrowRight; disabled?: boolean; className?: string }) {\n  const { language } = useLanguage();\n  return (\n    <button type="button" className={`action-btn ${secondary ? "secondary" : "primary"} ${className}`} onClick={onClick} disabled={disabled}>\n      <span>{typeof children === "string" ? tUi(children, language) : children}</span>\n      {Icon && <Icon size={16} />}\n    </button>\n  );\n}'
);

// Helper for exclusion
function isExcluded(s) {
  const t = s.trim();
  if (!t || t.length <= 1) return true;
  if (/^[\d\s.,:;!?%₹\/\(\)\-\+—–·•#@\^&*_{}\[\]\|\\=<>~`"']+$/.test(t)) return true;
  if (/^(?:\+91|FMR-|AP-|TKN-|REQ-|BKG-)/.test(t)) return true;
  if (t.includes('=>') || t.includes('void |') || t.includes('matrixSize') || t.includes('Promise') || t.includes('Language') || t.includes('===') || t.includes('!==') || t.includes('&&') || t.includes('||')) return true;
  if (/^₹?\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*[a-zA-Z]+)?$/.test(t)) return true;
  return false;
}

// 6. Replace toasts: toast.(success|error|info|warning)("...")
let toastReplaced = 0;
src = src.replace(/toast\.(success|error|info|warning)\(\s*(["'])(.*?)\2\s*\)/g, (fullMatch, fn, quote, content) => {
  const trimmed = content.trim();
  if (trimmed.startsWith('tUi(')) return fullMatch;
  if (te[trimmed] || te[content]) {
    const key = te[trimmed] ? trimmed : content;
    const escaped = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    toastReplaced++;
    return `toast.${fn}(tUi("${escaped}", language))`;
  }
  return fullMatch;
});

// 7. Replace attributes: placeholder="..." and title="..."
let attrReplaced = 0;
src = src.replace(/(placeholder|title)=(["'])(.*?)\2/g, (fullMatch, attr, quote, content) => {
  const trimmed = content.trim();
  if (isExcluded(trimmed)) return fullMatch;
  if (te[trimmed] || te[content]) {
    const key = te[trimmed] ? trimmed : content;
    const escaped = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    attrReplaced++;
    return `${attr}={tUi("${escaped}", language)}`;
  }
  return fullMatch;
});

// 8. Replace text nodes >Text<
let textReplaced = 0;
const lines = src.split('\n');
const processedLines = lines.map((line, idx) => {
  // If line has a comment or script, be cautious
  if (line.includes('//') && line.indexOf('//') < line.indexOf('>')) {
    // There is a comment before the JSX
  }
  return line.replace(/>([^<>{}\r\n]+)</g, (fullMatch, content) => {
    const trimmed = content.trim();
    if (isExcluded(trimmed)) return fullMatch;
    if (te[trimmed] || te[content]) {
      const key = te[trimmed] ? trimmed : content;
      const leadingWs = content.match(/^\s*/)[0];
      const trailingWs = content.match(/\s*$/)[0];
      const escaped = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      textReplaced++;
      return `>${leadingWs}{tUi("${escaped}", language)}${trailingWs}<`;
    }
    return fullMatch;
  });
});

src = processedLines.join('\n');

fs.writeFileSync(homePath, src, 'utf8');

console.log(`Master transformations applied to Home.tsx:`);
console.log(`- Text nodes localized: ${textReplaced}`);
console.log(`- Attributes localized: ${attrReplaced}`);
console.log(`- Toasts localized: ${toastReplaced}`);

