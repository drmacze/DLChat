import React from "react";
import Svg, { Path, Circle, G, Rect, Ellipse, Polygon } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function RobotIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="8" width="16" height="12" rx="3" fill="#8B5CF6" />
      <Rect x="9" y="4" width="6" height="4" rx="1" fill="#A78BFA" />
      <Circle cx="9" cy="13" r="2" fill="#fff" />
      <Circle cx="15" cy="13" r="2" fill="#fff" />
      <Circle cx="9" cy="13" r="1" fill="#6D28D9" />
      <Circle cx="15" cy="13" r="1" fill="#6D28D9" />
      <Rect x="8" y="17" width="8" height="1.5" rx="0.75" fill="#C4B5FD" />
      <Rect x="2" y="11" width="2" height="4" rx="1" fill="#7C3AED" />
      <Rect x="20" y="11" width="2" height="4" rx="1" fill="#7C3AED" />
      <Circle cx="12" cy="6" r="1" fill="#7C3AED" />
    </Svg>
  );
}

export function FireIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C12 2 8 6 8 10C8 10 6 9 6 7C4 9 3 12 3 15C3 19.418 7.134 22 12 22C16.866 22 21 19.418 21 15C21 10 15 5 12 2Z"
        fill="#F97316"
      />
      <Path
        d="M12 8C12 8 10 11 10 14C10 14 9 13.5 9 12C8 13 8 14.5 8 15C8 17.209 9.791 19 12 19C14.209 19 16 17.209 16 15C16 11.5 12 8 12 8Z"
        fill="#FCD34D"
      />
      <Circle cx="12" cy="16" r="2" fill="#FEF3C7" />
    </Svg>
  );
}

export function ChatBubbleIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4H20C21.1 4 22 4.9 22 6V16C22 17.1 21.1 18 20 18H7L3 22V6C3 4.9 3.9 4 4 4Z"
        fill="#3B82F6"
      />
      <Circle cx="8" cy="11" r="1.2" fill="#fff" />
      <Circle cx="12" cy="11" r="1.2" fill="#fff" />
      <Circle cx="16" cy="11" r="1.2" fill="#fff" />
    </Svg>
  );
}

export function GlobeIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill="#10B981" />
      <Path d="M12 3C12 3 9 7 9 12C9 17 12 21 12 21" stroke="#A7F3D0" strokeWidth="1" />
      <Path d="M12 3C12 3 15 7 15 12C15 17 12 21 12 21" stroke="#A7F3D0" strokeWidth="1" />
      <Path d="M3 12H21" stroke="#A7F3D0" strokeWidth="1" />
      <Path d="M4 8H20" stroke="#A7F3D0" strokeWidth="0.8" />
      <Path d="M4 16H20" stroke="#A7F3D0" strokeWidth="0.8" />
    </Svg>
  );
}

export function StarIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L14.5 9H22L16 13.5L18.5 20.5L12 16L5.5 20.5L8 13.5L2 9H9.5L12 2Z"
        fill="#F59E0B"
      />
      <Path
        d="M12 5L13.8 10.5H19.5L14.9 13.8L16.7 19.5L12 16.2L7.3 19.5L9.1 13.8L4.5 10.5H10.2L12 5Z"
        fill="#FDE68A"
      />
    </Svg>
  );
}

export function PeopleIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3.5" fill="#6366F1" />
      <Path d="M2 20C2 16.686 5.134 14 9 14C12.866 14 16 16.686 16 20H2Z" fill="#6366F1" />
      <Circle cx="17" cy="8" r="2.8" fill="#818CF8" />
      <Path d="M13 20C13 17.239 15.686 15 19 15H22V20H13Z" fill="#818CF8" />
    </Svg>
  );
}

export function TrophyIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3H18V12C18 15.314 15.314 18 12 18C8.686 18 6 15.314 6 12V3Z"
        fill="#F59E0B"
      />
      <Path d="M6 5H3C3 5 3 10 6 10" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
      <Path d="M18 5H21C21 5 21 10 18 10" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
      <Rect x="9" y="18" width="6" height="2" rx="1" fill="#D97706" />
      <Rect x="7" y="20" width="10" height="2" rx="1" fill="#D97706" />
      <Path d="M9 10L10.5 12L12 9L13.5 12L15 10" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CameraIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 8C2 6.9 2.9 6 4 6H8L10 4H14L16 6H20C21.1 6 22 6.9 22 8V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V8Z"
        fill="#EC4899"
      />
      <Circle cx="12" cy="13" r="3.5" fill="#FDF2F8" />
      <Circle cx="12" cy="13" r="2" fill="#EC4899" />
      <Circle cx="19" cy="9" r="1" fill="#FDF2F8" />
    </Svg>
  );
}

export function WaveIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 3C8 2.448 8.448 2 9 2C9.552 2 10 2.448 10 3V11L11.5 9.5C11.891 9.109 12.53 9.109 12.921 9.5C13.312 9.891 13.312 10.53 12.921 10.921L11 12.842V13L14.5 9.5C14.891 9.109 15.53 9.109 15.921 9.5C16.312 9.891 16.312 10.53 15.921 10.921L13.5 13.342C13.5 13.342 16 11.5 16.5 11.5C17.052 11.5 17.5 11.948 17.5 12.5C17.5 12.5 18 12 18.5 12C19.052 12 19.5 12.448 19.5 13L19 15C19 18.866 15.866 22 12 22C8.134 22 5 18.866 5 15V6C5 5.448 5.448 5 6 5C6.552 5 7 5.448 7 6V10C7 10 7.5 9.5 8 9.5C8 9.5 8 3 8 3Z"
        fill="#F97316"
      />
    </Svg>
  );
}

export function PhotoIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="2" y="4" width="16" height="12" rx="2" fill="#38BDF8" />
      <Circle cx="7" cy="8" r="1.5" fill="#FEF3C7" />
      <Path d="M2 14L7 10L10 13L14 9L18 14H2Z" fill="#0284C7" />
    </Svg>
  );
}

export function VideoIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="1" y="5" width="12" height="10" rx="2" fill="#EF4444" />
      <Path d="M13 8L19 5V15L13 12V8Z" fill="#FCA5A5" />
    </Svg>
  );
}

export function MicIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="7" y="1" width="6" height="10" rx="3" fill="#10B981" />
      <Path d="M3 10C3 10 3 15 10 15C17 15 17 10 17 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
      <Path d="M10 15V19" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
      <Path d="M7 19H13" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function PaperclipIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M16.5 7L9 14.5C7.343 16.157 4.657 16.157 3 14.5C1.343 12.843 1.343 10.157 3 8.5L10.5 1C11.601 -0.101 13.399 -0.101 14.5 1C15.601 2.101 15.601 3.899 14.5 5L7 12.5C6.45 13.05 5.55 13.05 5 12.5C4.45 11.95 4.45 11.05 5 10.5L11.5 4"
        stroke="#94A3B8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PinIcon({ size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M10 2L14 6L10 10V13L8 15L6 13V10L2 6L6 2H10Z" fill="#EF4444" />
      <Path d="M8 6V10" stroke="#FEE2E2" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function MuteIcon({ size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M8 2L4 5H2V11H4L8 14V2Z" fill="#94A3B8" />
      <Path d="M13 5L11 7M11 5L13 7" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M2 14L14 2" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}
