import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useSpring } from 'motion/react';

export default function CategoryHeroArt({ category }) {
  const root = useRef(null);
  const inView = useInView(root);
  const reducedMotion = useReducedMotion();
  const [hidden, setHidden] = useState(() => document.hidden);
  const [failed, setFailed] = useState(false);
  const rotateX = useSpring(0, { stiffness: 65, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 65, damping: 22 });
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const reset = () => { rotateX.set(0); rotateY.set(0); };
  const tilt = event => {
    if (reducedMotion || event.pointerType !== 'mouse') return;
    const rect = root.current.getBoundingClientRect();
    rotateX.set(-((event.clientY - rect.top) / rect.height - .5) * 6);
    rotateY.set(((event.clientX - rect.left) / rect.width - .5) * 8);
  };
  return <div ref={root} className="catalog-hero-art" aria-hidden="true"
    data-active={inView && !hidden && !reducedMotion} onPointerMove={tilt} onPointerLeave={reset}>
    <span className="catalog-orbit" />
    <span className="catalog-device-shadow" />
    <motion.div className="catalog-device-tilt" style={{ rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY }}>
      <div className="catalog-device-float">
        <img src={failed ? category.fallbackImage : category.image} alt="" width="640" height="480" decoding="async" fetchPriority="high" onError={() => setFailed(true)} />
      </div>
    </motion.div>
  </div>;
}
