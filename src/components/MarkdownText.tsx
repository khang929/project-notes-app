import React from 'react';

// Hiển thị Markdown cơ bản (không cần thư viện, không dùng dangerouslySetInnerHTML
// nên an toàn với nội dung do AI hoặc người dùng tạo).
// Hỗ trợ: tiêu đề #, **đậm**, *nghiêng*, `mã`, danh sách gạch đầu dòng / đánh số, checkbox [ ] [x],
// khối mã, đường kẻ ---, đoạn văn.


function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Thứ tự ưu tiên: `code`, **đậm**, *nghiêng* / _nghiêng_
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(\*[^*\s][^*\n]*?\*)|(\b_[^_\n]+?_\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (m[1]) {
      nodes.push(
        <code key={key} className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/70 font-mono text-[0.9em]">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (m[2]) {
      nodes.push(
        <strong key={key} className="font-bold">
          {renderInline(tok.slice(2, -2), key)}
        </strong>
      );
    } else {
      nodes.push(
        <em key={key} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: { text: string; checked?: boolean }[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'hr' }
  | { type: 'p'; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Khối mã
    if (/^\s*```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i++; // bỏ dòng ``` đóng
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }

    // Đường kẻ
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Tiêu đề
    const h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    // Danh sách gạch đầu dòng / checkbox (cũng nhận dấu • do AI hay dùng)
    if (/^\s*([-*+•])\s+/.test(line)) {
      const items: { text: string; checked?: boolean }[] = [];
      while (i < lines.length && /^\s*([-*+•])\s+/.test(lines[i])) {
        let t = lines[i].replace(/^\s*([-*+•])\s+/, '');
        let checked: boolean | undefined;
        const cb = /^\[( |x|X)\]\s+/.exec(t);
        if (cb) {
          checked = cb[1].toLowerCase() === 'x';
          t = t.slice(cb[0].length);
        }
        items.push({ text: t, checked });
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Danh sách đánh số
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Đoạn văn: gom đến dòng trống hoặc khối khác
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s{0,3}#{1,6}\s+/.test(lines[i]) &&
      !/^\s*([-*+•])\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    blocks.push({ type: 'p', text: buf.join('\n') });
  }
  return blocks;
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-base font-bold',
  2: 'text-[15px] font-bold',
  3: 'text-sm font-bold',
  4: 'text-sm font-semibold',
  5: 'text-xs font-semibold',
  6: 'text-xs font-semibold',
};

export const MarkdownText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const blocks = parseBlocks(text || '');
  return (
    <div className={`space-y-2 break-words ${className}`}>
      {blocks.map((b, idx) => {
        const key = `b${idx}`;
        switch (b.type) {
          case 'heading':
            return (
              <div key={key} className={`${HEADING_CLASS[b.level]} pt-1`}>
                {renderInline(b.text, key)}
              </div>
            );
          case 'ul':
            return (
              <ul key={key} className="space-y-1 pl-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    {it.checked === undefined ? (
                      <span className="mt-[0.6em] w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0" />
                    ) : (
                      <input type="checkbox" checked={it.checked} readOnly className="mt-1 shrink-0 accent-indigo-600" />
                    )}
                    <span className={it.checked ? 'line-through opacity-60' : ''}>
                      {renderInline(it.text, `${key}-${j}`)}
                    </span>
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="space-y-1 pl-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="shrink-0 font-semibold tabular-nums opacity-70">{j + 1}.</span>
                    <span>{renderInline(it, `${key}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            );
          case 'code':
            return (
              <pre
                key={key}
                className="p-2.5 rounded-lg bg-slate-200/70 dark:bg-slate-900/80 font-mono text-[0.85em] overflow-x-auto whitespace-pre"
              >
                {b.text}
              </pre>
            );
          case 'hr':
            return <hr key={key} className="border-slate-300/60 dark:border-slate-600/60" />;
          default:
            return (
              <p key={key} className="whitespace-pre-line">
                {renderInline(b.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
};
