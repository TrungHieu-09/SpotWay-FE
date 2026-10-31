import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';

import { hazardRect, type Floor, type HazardZone } from '@/data/mock-floor';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

const DANGER = '#D64545';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Translucent red hatched zone on the floor of a simulated incident, with a pulsing warning dot
 * (a static solid dot when the system asks to reduce motion).
 */
export function HazardOverlay({ hazard, floor }: { hazard: HazardZone | null; floor: Floor }) {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  if (!hazard || hazard.floor !== floor) return null;
  const r = hazardRect(hazard.zone);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const ringR = pulse.interpolate({ inputRange: [0, 1], outputRange: [16, 40] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <G pointerEvents="none">
      <Defs>
        <Pattern id="hazardHatch" patternUnits="userSpaceOnUse" width={8} height={8}>
          <Rect width={8} height={8} fill={DANGER} fillOpacity={reduceMotion ? 0.2 : 0.12} />
          <Line x1={0} y1={8} x2={8} y2={0} stroke={DANGER} strokeWidth={2} strokeOpacity={0.5} />
        </Pattern>
      </Defs>
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill="url(#hazardHatch)"
        stroke={DANGER}
        strokeWidth={2}
        strokeDasharray={[6, 4]}
      />
      {!reduceMotion && (
        <AnimatedCircle cx={cx} cy={cy} r={ringR} fill={DANGER} opacity={ringOpacity} />
      )}
      <Circle cx={cx} cy={cy} r={16} fill={DANGER} stroke="#FFFFFF" strokeWidth={3} />
      <G transform={`translate(${cx}, ${cy})`}>
        <Path d="M0 -8 L8 6 H-8 Z" fill="#FFFFFF" />
        <Path d="M0 -3 V1.5 M0 3.5 V4" stroke={DANGER} strokeWidth={2} strokeLinecap="round" />
      </G>
    </G>
  );
}
