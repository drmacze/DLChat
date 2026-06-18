import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  placeholder?: string;
}

export default function MessageInput({ onSend, onTyping, onStopTyping, placeholder = "Message..." }: MessageInputProps) {
  const [text, setText] = useState("");
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = (val: string) => {
    setText(val);
    if (val.length > 0) {
      onTyping?.();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onStopTyping?.(), 2000);
    } else {
      onStopTyping?.();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText("");
    onStopTyping?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.sidebar,
          borderTopColor: c.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={[styles.inputRow, { backgroundColor: c.surface }]}>
        <TextInput
          style={[styles.input, { color: c.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={c.mutedForeground}
          value={text}
          onChangeText={handleChangeText}
          multiline
          maxLength={4000}
          onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? c.primary : "transparent" }]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={!text.trim()}
        >
          <Feather
            name="send"
            size={18}
            color={text.trim() ? "#fff" : c.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});
