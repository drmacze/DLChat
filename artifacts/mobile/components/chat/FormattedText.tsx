import React from "react";
import { Text, StyleSheet } from "react-native";

interface FormattedTextProps {
  text: string;
  style?: object;
  numberOfLines?: number;
}

interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
}

function parseFormatting(raw: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  let current = "";

  while (i < raw.length) {
    if (raw[i] === "`" && !startsTag(raw, i, "``")) {
      const end = raw.indexOf("`", i + 1);
      if (end !== -1 && end !== i + 1) {
        if (current) segments.push({ text: current });
        current = "";
        segments.push({ text: raw.slice(i + 1, end), code: true });
        i = end + 1;
        continue;
      }
    }
    if (raw[i] === "*" && raw[i + 1] !== "*") {
      const end = raw.indexOf("*", i + 1);
      if (end !== -1 && end !== i + 1) {
        if (current) segments.push({ text: current });
        current = "";
        segments.push({ text: raw.slice(i + 1, end), bold: true });
        i = end + 1;
        continue;
      }
    }
    if (raw[i] === "_" && raw[i + 1] !== "_") {
      const end = raw.indexOf("_", i + 1);
      if (end !== -1 && end !== i + 1) {
        if (current) segments.push({ text: current });
        current = "";
        segments.push({ text: raw.slice(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }
    if (raw[i] === "~" && raw[i + 1] !== "~") {
      const end = raw.indexOf("~", i + 1);
      if (end !== -1 && end !== i + 1) {
        if (current) segments.push({ text: current });
        current = "";
        segments.push({ text: raw.slice(i + 1, end), strike: true });
        i = end + 1;
        continue;
      }
    }
    current += raw[i];
    i++;
  }

  if (current) segments.push({ text: current });
  return segments;
}

function startsTag(s: string, i: number, tag: string): boolean {
  return s.slice(i, i + tag.length) === tag;
}

export default function FormattedText({ text, style, numberOfLines }: FormattedTextProps) {
  if (!text) return null;

  const hasMeta = text.includes("*") || text.includes("_") || text.includes("`") || text.includes("~");
  if (!hasMeta) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  const segments = parseFormatting(text);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, idx) => {
        if (seg.code) {
          return <Text key={idx} style={styles.code}>{seg.text}</Text>;
        }
        const s: object[] = [];
        if (seg.bold) s.push(styles.bold);
        if (seg.italic) s.push(styles.italic);
        if (seg.strike) s.push(styles.strike);
        return <Text key={idx} style={s.length ? s : undefined}>{seg.text}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  strike: { textDecorationLine: "line-through" },
  code: {
    fontFamily: "Courier New",
    fontSize: 13,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 4,
    paddingHorizontal: 4,
  },
});
