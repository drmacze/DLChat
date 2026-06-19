import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/utils/api";

interface PreviewData {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

const cache = new Map<string, PreviewData>();

function extractUrls(text: string): string[] {
  const regex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return [...new Set(text.match(regex) ?? [])].slice(0, 1);
}

interface LinkPreviewProps {
  text: string;
  isMe: boolean;
}

export default function LinkPreview({ text, isMe }: LinkPreviewProps) {
  const { c } = useTheme();
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const urls = extractUrls(text);
  const url = urls[0];

  useEffect(() => {
    if (!url) return;
    if (cache.has(url)) {
      setPreview(cache.get(url)!);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const res = await fetch(
          `${BASE_URL}/api/link-preview?url=${encodeURIComponent(url)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data: PreviewData = await res.json();
        cache.set(url, data);
        if (mounted) setPreview(data);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [url]);

  if (!url || !preview) return null;
  if (!preview.title && !preview.description && !preview.image) return null;

  const bg = isMe ? "rgba(0,0,0,0.2)" : c.surface;
  const borderColor = isMe ? "rgba(255,255,255,0.3)" : c.border;
  const titleColor = isMe ? "#fff" : c.foreground;
  const descColor = isMe ? "rgba(255,255,255,0.7)" : c.mutedForeground;
  const domainColor = isMe ? "rgba(255,255,255,0.5)" : c.primary;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bg as string, borderColor: borderColor as string }]}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.8}
    >
      {preview.image && (
        <Image
          source={{ uri: preview.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <View style={styles.body}>
        <Text style={[styles.domain, { color: domainColor as string }]} numberOfLines={1}>
          {preview.domain}
        </Text>
        {preview.title && (
          <Text style={[styles.title, { color: titleColor as string }]} numberOfLines={2}>
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text style={[styles.desc, { color: descColor as string }]} numberOfLines={2}>
            {preview.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 6,
    maxWidth: 260,
  },
  image: { width: "100%", height: 120 },
  body: { padding: 8, gap: 2 },
  domain: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
