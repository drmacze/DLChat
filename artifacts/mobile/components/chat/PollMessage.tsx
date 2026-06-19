import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

interface PollOption {
  index: number;
  text: string;
  voteCount: number;
  isVotedByMe: boolean;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isMultiple: boolean;
  isAnonymous: boolean;
  isClosed: boolean;
  creatorName: string;
  createdAt: string;
}

interface PollMessageProps {
  pollId: string;
  isMe: boolean;
  onPollUpdate?: () => void;
}

export default function PollMessage({ pollId, isMe, onPollUpdate }: PollMessageProps) {
  const { c } = useTheme();
  const { token } = useAuth();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/polls/${pollId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as PollData;
        setPoll(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [pollId, token]);

  React.useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  const vote = async (optionIndex: number) => {
    if (!poll || poll.isClosed || voting) return;
    const alreadyVoted = poll.options.some((o) => o.isVotedByMe);
    if (alreadyVoted && !poll.isMultiple) {
      Alert.alert("Sudah Pilih", "Kamu sudah memilih opsi. Kamu hanya dapat memilih satu opsi.");
      return;
    }
    setVoting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });
      if (res.ok) {
        await fetchPoll();
        onPollUpdate?.();
      }
    } catch {
    } finally {
      setVoting(false);
    }
  };

  const bg = isMe ? "rgba(255,255,255,0.08)" : c.surface;
  const accentColor = isMe ? "rgba(255,255,255,0.85)" : c.primary;
  const textColor = isMe ? "#fff" : c.foreground;
  const mutedColor = isMe ? "rgba(255,255,255,0.6)" : c.mutedForeground;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Text style={{ color: mutedColor, fontSize: 13 }}>📊 Poll tidak tersedia</Text>
      </View>
    );
  }

  const maxVotes = Math.max(...poll.options.map((o) => o.voteCount), 1);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={[styles.pollIcon]}>📊</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pollLabel, { color: mutedColor }]}>
            {poll.isMultiple ? "Pilihan Ganda" : "Pilih Satu"} · {poll.isAnonymous ? "Anonim" : "Publik"}
          </Text>
          <Text style={[styles.question, { color: textColor }]}>{poll.question}</Text>
        </View>
        {poll.isClosed && (
          <View style={[styles.closedBadge]}>
            <Text style={styles.closedText}>Selesai</Text>
          </View>
        )}
      </View>

      <View style={styles.options}>
        {poll.options.map((opt) => {
          const pct = poll.totalVotes > 0 ? (opt.voteCount / poll.totalVotes) * 100 : 0;
          const isWinner = opt.voteCount === maxVotes && poll.totalVotes > 0;
          return (
            <TouchableOpacity
              key={opt.index}
              style={[styles.option, opt.isVotedByMe && styles.optionVoted, { borderColor: opt.isVotedByMe ? accentColor : "rgba(255,255,255,0.12)" }]}
              onPress={() => vote(opt.index)}
              disabled={poll.isClosed || voting}
              activeOpacity={0.7}
            >
              <View style={[styles.bar, { width: `${pct}%` as any, backgroundColor: isMe ? "rgba(255,255,255,0.15)" : `${c.primary}20` }]} />
              <View style={styles.optionRow}>
                <Text style={[styles.optionText, { color: textColor }]} numberOfLines={2}>{opt.text}</Text>
                <View style={styles.optionRight}>
                  {opt.isVotedByMe && <Feather name="check" size={14} color={accentColor} style={{ marginRight: 6 }} />}
                  {isWinner && poll.totalVotes > 0 && <Text style={{ fontSize: 12, marginRight: 4 }}>🏆</Text>}
                  <Text style={[styles.pct, { color: mutedColor }]}>{Math.round(pct)}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.meta, { color: mutedColor }]}>
        {poll.totalVotes} suara{poll.isAnonymous ? " · Anonim" : ""}
        {poll.isClosed ? " · Polling ditutup" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    minWidth: 220,
    maxWidth: 300,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  pollIcon: { fontSize: 22, marginTop: 2 },
  pollLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 3 },
  question: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  closedBadge: {
    backgroundColor: "rgba(255,100,100,0.2)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closedText: { fontSize: 11, color: "#ff6464", fontFamily: "Inter_600SemiBold" },
  options: { gap: 6 },
  option: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    minHeight: 36,
  },
  optionVoted: { borderWidth: 1.5 },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  optionRight: { flexDirection: "row", alignItems: "center" },
  pct: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 32, textAlign: "right" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8 },
});
