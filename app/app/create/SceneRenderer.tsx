"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type SceneTextBlock = {
  startMs: number;
  endMs: number;
  text: string;
};

export type SceneRendererData = {
  sceneTitle: string;
  animationPreset: string;
  backgroundPrompt: string;
  timedTextBlocks: SceneTextBlock[];
};

type SceneRendererProps = {
  scene: SceneRendererData;
};

export default function SceneRenderer({ scene }: SceneRendererProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const started = performance.now();

    const tick = () => {
      const elapsed = performance.now() - started;
      setElapsedMs(elapsed);
      frame = requestAnimationFrame(tick);
    };

    let frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scene.animationPreset, scene.sceneTitle]);

  const activeBlock = useMemo(() => {
    return scene.timedTextBlocks.find(
      (block) => elapsedMs >= block.startMs && elapsedMs <= block.endMs
    );
  }, [elapsedMs, scene.timedTextBlocks]);

  return (
    <section className="qc-scene-renderer" aria-label="Scene preview">
      <div className="qc-scene-bg" />
      <header className="qc-scene-header">
        <p className="qc-scene-kicker">Scene</p>
        <h3>{scene.sceneTitle}</h3>
        <p>{scene.animationPreset}</p>
      </header>
      <AnimatePresence mode="wait">
        {activeBlock ? (
          <motion.p
            key={`${activeBlock.startMs}-${activeBlock.text}`}
            className="qc-scene-text"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {activeBlock.text}
          </motion.p>
        ) : (
          <motion.p
            key="idle"
            className="qc-scene-text is-idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          >
            {scene.backgroundPrompt}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
