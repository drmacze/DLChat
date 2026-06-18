import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  useAnimatedProps,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size?: number;
}

export default function DlavieLogo({ size = 80 }: Props) {
  const pulse = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
    rotate.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Outer ripple ring
  const ripple1Props = useAnimatedProps(() => ({
    r: interpolate(pulse.value, [0, 1], [28, 38]),
    opacity: interpolate(pulse.value, [0, 0.4, 1], [0.18, 0.1, 0]),
    strokeWidth: interpolate(pulse.value, [0, 1], [2, 0.5]),
  }));

  const ripple2Props = useAnimatedProps(() => ({
    r: interpolate(pulse.value, [0, 1], [22, 32]),
    opacity: interpolate(pulse.value, [0, 0.5, 1], [0.25, 0.12, 0]),
    strokeWidth: interpolate(pulse.value, [0, 1], [1.5, 0.5]),
  }));

  // Glow ring container scale
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pulse.value, [0, 0.5, 1], [1, 1.035, 1]),
      },
    ],
  }));

  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  // Chat bubble path scaled to size
  // Main speech bubble: rounded rect with a small tail at bottom-left
  const scale = s / 80;
  const bw = 50 * scale; // bubble width
  const bh = 36 * scale; // bubble height
  const br = 10 * scale; // border radius
  const bx = (s - bw) / 2; // left x
  const by = (s - bh) / 2 - 4 * scale; // top y (slightly above center to make room for tail)
  const tx = bx + 8 * scale; // tail x start
  const ty = by + bh; // tail y (bottom of bubble)

  // Bezier speech bubble path
  const bubblePath = [
    `M ${bx + br} ${by}`,
    `L ${bx + bw - br} ${by}`,
    `Q ${bx + bw} ${by} ${bx + bw} ${by + br}`,
    `L ${bx + bw} ${by + bh - br}`,
    `Q ${bx + bw} ${by + bh} ${bx + bw - br} ${by + bh}`,
    `L ${tx + 8 * scale} ${ty}`,
    `L ${tx + 2 * scale} ${ty + 9 * scale}`,
    `L ${tx} ${ty}`,
    `L ${bx + br} ${ty}`,
    `Q ${bx} ${ty} ${bx} ${ty - br}`,
    `L ${bx} ${by + br}`,
    `Q ${bx} ${by} ${bx + br} ${by}`,
    `Z`,
  ].join(" ");

  // Three typing dots inside the bubble
  const dotY = by + bh / 2 + 1 * scale;
  const dotR = 3 * scale;
  const dotSpacing = 10 * scale;
  const dot1x = cx - dotSpacing;
  const dot2x = cx;
  const dot3x = cx + dotSpacing;

  return (
    <Animated.View style={logoStyle}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Ripple rings */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          stroke="#2AABEE"
          fill="none"
          animatedProps={ripple1Props}
        />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          stroke="#2AABEE"
          fill="none"
          animatedProps={ripple2Props}
        />

        {/* Background circle */}
        <Circle cx={cx} cy={cy} r={26 * scale} fill="#1A3A52" />

        {/* Chat bubble */}
        <Path d={bubblePath} fill="#2AABEE" />

        {/* Three dots */}
        <Circle cx={dot1x} cy={dotY} r={dotR} fill="white" opacity={0.9} />
        <Circle cx={dot2x} cy={dotY} r={dotR} fill="white" opacity={0.9} />
        <Circle cx={dot3x} cy={dotY} r={dotR} fill="white" opacity={0.9} />
      </Svg>
    </Animated.View>
  );
}
