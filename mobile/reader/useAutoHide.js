import { useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';

const THRESHOLD = 8; // px de scroll antes de reaccionar, para ignorar temblores

// Barras flotantes que se ocultan al bajar y reaparecen al subir o al tocar.
export function useAutoHide() {
  const [visible, setVisible] = useState(true);
  const progress = useRef(new Animated.Value(1)).current;
  const lastY = useRef(0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible, progress]);

  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    lastY.current = y;
    if (y < 24) setVisible(true);
    else if (dy > THRESHOLD) setVisible(false);
    else if (dy < -THRESHOLD) setVisible(true);
  };

  return {
    visible,
    progress,
    onScroll,
    show: () => setVisible(true),
    hide: () => setVisible(false),
    toggle: () => setVisible((v) => !v),
  };
}
