// Code-box keyboard behaviour (ported from web_course CodeStep): Tab / Shift+Tab indent and
// unindent lines, Enter keeps the indent (+4 after ":"). Pure string logic, unit-tested.

export const INDENT = '    ';

export type Edit = { value: string; selectionStart: number; selectionEnd: number };

export function onTab(value: string, start: number, end: number, shift: boolean): Edit {
  if (start === end && !shift) {
    return {
      value: value.slice(0, start) + INDENT + value.slice(end),
      selectionStart: start + 4,
      selectionEnd: start + 4,
    };
  }
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const block = value.slice(lineStart, end);
  const lines = block.split('\n');
  const changed = shift
    ? lines.map((l) => l.replace(/^( {1,4}|\t)/, ''))
    : lines.map((l) => INDENT + l);
  const newBlock = changed.join('\n');
  const firstDelta = changed[0]!.length - lines[0]!.length;
  return {
    value: value.slice(0, lineStart) + newBlock + value.slice(end),
    selectionStart: Math.max(lineStart, start + firstDelta),
    selectionEnd: lineStart + newBlock.length,
  };
}

export function onEnter(value: string, start: number, end: number): Edit {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const line = value.slice(lineStart, start);
  let indent = /^[ \t]*/.exec(line)![0];
  if (line.trimEnd().endsWith(':')) indent += INDENT;
  const insert = `\n${indent}`;
  const caret = start + insert.length;
  return {
    value: value.slice(0, start) + insert + value.slice(end),
    selectionStart: caret,
    selectionEnd: caret,
  };
}
