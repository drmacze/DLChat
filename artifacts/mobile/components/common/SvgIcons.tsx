import React from "react";
import Svg, { Path, Circle, G, Rect, Ellipse, Polygon, Defs, RadialGradient, Stop, LinearGradient } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function RobotIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="8" width="16" height="12" rx="3.5" fill="#7C79F0" />
      <Rect x="9" y="4" width="6" height="5" rx="1.5" fill="#9490F5" />
      <Circle cx="9" cy="13" r="2.2" fill="rgba(255,255,255,0.92)" />
      <Circle cx="15" cy="13" r="2.2" fill="rgba(255,255,255,0.92)" />
      <Circle cx="9" cy="13" r="1.1" fill="#6864E0" />
      <Circle cx="15" cy="13" r="1.1" fill="#6864E0" />
      <Rect x="8.5" y="17.2" width="7" height="1.4" rx="0.7" fill="rgba(255,255,255,0.6)" />
      <Rect x="2" y="11" width="2" height="4" rx="1" fill="#8480EC" />
      <Rect x="20" y="11" width="2" height="4" rx="1" fill="#8480EC" />
      <Circle cx="12" cy="5.8" r="1" fill="#A8A4F8" />
    </Svg>
  );
}

export function FireIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C12 2 7.5 6.5 7.5 11C7.5 11 5.5 10 5.5 7.5C3.5 10 3 13 3 15.5C3 20.09 7.134 23 12 23C16.866 23 21 20.09 21 15.5C21 10 14.5 5 12 2Z"
        fill="#E07838"
      />
      <Path
        d="M12 8C12 8 10 11.5 10 14.5C10 14.5 9 14 9 12.5C8 13.5 7.5 15 7.5 16C7.5 18.485 9.515 20.5 12 20.5C14.485 20.5 16.5 18.485 16.5 16C16.5 12 12 8 12 8Z"
        fill="#F5BC60"
      />
      <Ellipse cx="12" cy="17" rx="2.2" ry="2.2" fill="#FEF4DC" />
    </Svg>
  );
}

export function ChatBubbleIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6C3 4.895 3.895 4 5 4H19C20.105 4 21 4.895 21 6V15C21 16.105 20.105 17 19 17H8L4 21V6H3Z"
        fill="#7C79F0"
      />
      <Circle cx="8.5" cy="10.5" r="1.3" fill="rgba(255,255,255,0.85)" />
      <Circle cx="12" cy="10.5" r="1.3" fill="rgba(255,255,255,0.85)" />
      <Circle cx="15.5" cy="10.5" r="1.3" fill="rgba(255,255,255,0.85)" />
    </Svg>
  );
}

export function GlobeIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill="#3AADA6" opacity={0.9} />
      <Path d="M12 3C12 3 9.5 7 9.5 12C9.5 17 12 21 12 21" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <Path d="M12 3C12 3 14.5 7 14.5 12C14.5 17 12 21 12 21" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <Path d="M3 12H21" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <Path d="M3.9 8H20.1" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      <Path d="M3.9 16H20.1" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
    </Svg>
  );
}

export function StarIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L14.7 9.3H22.5L16.3 13.8L18.9 21L12 16.5L5.1 21L7.7 13.8L1.5 9.3H9.3L12 2Z"
        fill="#E09030"
      />
      <Path
        d="M12 5.5L14 10.5H19.5L15.2 13.8L16.8 18.8L12 15.8L7.2 18.8L8.8 13.8L4.5 10.5H10L12 5.5Z"
        fill="#F5D070"
      />
    </Svg>
  );
}

export function PeopleIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3.5" fill="#7C79F0" />
      <Path d="M2 20C2 16.686 5.134 14 9 14C12.866 14 16 16.686 16 20H2Z" fill="#7C79F0" />
      <Circle cx="17" cy="8" r="2.8" fill="#9490F5" />
      <Path d="M13 20C13 17.239 15.686 15 19 15H22V20H13Z" fill="#9490F5" />
    </Svg>
  );
}

export function TrophyIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3H18V12C18 15.314 15.314 18 12 18C8.686 18 6 15.314 6 12V3Z"
        fill="#E09030"
      />
      <Path d="M6 5H3C3 5 3 10 6 10" stroke="#CC7020" strokeWidth="2" strokeLinecap="round" />
      <Path d="M18 5H21C21 5 21 10 18 10" stroke="#CC7020" strokeWidth="2" strokeLinecap="round" />
      <Rect x="9" y="18" width="6" height="2" rx="1" fill="#CC7020" />
      <Rect x="7" y="20" width="10" height="2" rx="1" fill="#CC7020" />
      <Path d="M9 10L10.5 12L12 9L13.5 12L15 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CameraIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 8C2 6.9 2.9 6 4 6H8L10 4H14L16 6H20C21.1 6 22 6.9 22 8V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V8Z"
        fill="#7C79F0"
      />
      <Circle cx="12" cy="13" r="3.5" fill="rgba(255,255,255,0.92)" />
      <Circle cx="12" cy="13" r="2" fill="#6864E0" />
      <Circle cx="19" cy="9" r="1" fill="rgba(255,255,255,0.7)" />
    </Svg>
  );
}

export function WaveIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 3C8 2.448 8.448 2 9 2C9.552 2 10 2.448 10 3V11L11.5 9.5C11.891 9.109 12.53 9.109 12.921 9.5C13.312 9.891 13.312 10.53 12.921 10.921L11 12.842V13L14.5 9.5C14.891 9.109 15.53 9.109 15.921 9.5C16.312 9.891 16.312 10.53 15.921 10.921L13.5 13.342C13.5 13.342 16 11.5 16.5 11.5C17.052 11.5 17.5 11.948 17.5 12.5C17.5 12.5 18 12 18.5 12C19.052 12 19.5 12.448 19.5 13L19 15C19 18.866 15.866 22 12 22C8.134 22 5 18.866 5 15V6C5 5.448 5.448 5 6 5C6.552 5 7 5.448 7 6V10C7 10 7.5 9.5 8 9.5C8 9.5 8 3 8 3Z"
        fill="#E07838"
      />
    </Svg>
  );
}

export function PhotoIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="2" y="4" width="16" height="12" rx="2.5" fill="#3AADA6" />
      <Circle cx="7" cy="8" r="1.5" fill="rgba(255,255,255,0.85)" />
      <Path d="M2 14L7 10L10 13L14 9L18 14H2Z" fill="rgba(0,0,0,0.15)" />
    </Svg>
  );
}

export function VideoIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="1" y="5" width="12" height="10" rx="2.5" fill="#E06060" />
      <Path d="M13 8L19 5V15L13 12V8Z" fill="#F09090" />
    </Svg>
  );
}

export function MicIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="7" y="1" width="6" height="10" rx="3" fill="#3CB87A" />
      <Path d="M3 10C3 10 3 15 10 15C17 15 17 10 17 10" stroke="#3CB87A" strokeWidth="2" strokeLinecap="round" />
      <Path d="M10 15V19" stroke="#3CB87A" strokeWidth="2" strokeLinecap="round" />
      <Path d="M7 19H13" stroke="#3CB87A" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function PaperclipIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M16.5 7L9 14.5C7.343 16.157 4.657 16.157 3 14.5C1.343 12.843 1.343 10.157 3 8.5L10.5 1C11.601 -0.101 13.399 -0.101 14.5 1C15.601 2.101 15.601 3.899 14.5 5L7 12.5C6.45 13.05 5.55 13.05 5 12.5C4.45 11.95 4.45 11.05 5 10.5L11.5 4"
        stroke="#8480EC"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PinIcon({ size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M10 2L14 6L10 10V13L8 15L6 13V10L2 6L6 2H10Z" fill="#E06060" />
      <Path d="M8 6V10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function MuteIcon({ size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M8 2L4 5H2V11H4L8 14V2Z" fill="#888884" />
      <Path d="M13 5L11 7M11 5L13 7" stroke="#888884" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M2 14L14 2" stroke="#E06060" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}
