import { useEffect, useRef } from "react";
import { mountShader } from "./shader-hero.js";

/**
 * <ShaderHero colors={["#141026", "#4c3a8f", "#e0a37a"]} speed={0.45}>
 *   <p className="eyebrow">Field notes</p>
 *   <h1>Instruments for slow work</h1>
 * </ShaderHero>
 */
export default function ShaderHero({
  colors = ["#141026", "#4c3a8f", "#e0a37a"],
  speed = 0.5,
  grain = 0.05,
  className = "",
  children,
}) {
  const host = useRef(null);

  useEffect(() => {
    if (!host.current) return;
    const inst = mountShader(host.current, { colors: colors.join(","), speed, grain });
    return () => inst?.destroy?.();
  }, [colors.join(","), speed, grain]);

  return (
    <section ref={host} className={`shader-hero ${className}`}>
      <canvas aria-hidden="true" />
      <div className="shader-hero__content">{children}</div>
    </section>
  );
}
