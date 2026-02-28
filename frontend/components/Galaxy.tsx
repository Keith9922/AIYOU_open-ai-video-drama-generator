import React, { useEffect, useRef, useState, useCallback } from 'react';

interface GalaxyProps {
  focal?: [number, number];
  rotation?: [number, number];
  starSpeed?: number;
  density?: number;
  hueShift?: number;
  disableAnimation?: boolean;
  speed?: number;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  saturation?: number;
  mouseRepulsion?: boolean;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  repulsionStrength?: number;
  autoCenterRepulsion?: number;
  transparent?: boolean;
  className?: string;
}

export const Galaxy: React.FC<GalaxyProps> = React.memo(({
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 140,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.3,
  saturation = 0.0,
  mouseRepulsion = true,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  repulsionStrength = 2,
  autoCenterRepulsion = 0,
  transparent = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const starsRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    hue: number;
    brightness: number;
    twinkle: number;
    driftAngle: number;
    driftSpeed: number;
    initialRadius: number;
  }>>([]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const starCount = Math.floor(250 * density);
    const centerX = width * focal[0];
    const centerY = height * focal[1];
    const maxDist = Math.max(width, height) * 0.7;

    const stars: Array<{
      x: number;
      y: number;
      size: number;
      hue: number;
      brightness: number;
      twinkle: number;
      driftAngle: number;
      driftSpeed: number;
      initialRadius: number;
    }> = [];

    for (let i = 0; i < starCount; i++) {
      const driftAngle = Math.random() * Math.PI * 2;
      
      const t = Math.random();
      const initialRadius = t * maxDist;

      const x = centerX + Math.cos(driftAngle) * initialRadius;
      const y = centerY + Math.sin(driftAngle) * initialRadius;

      const sizeRandom = Math.random();
      const size = sizeRandom < 0.85 ? sizeRandom * 2 + 0.5 : sizeRandom * 3.5 + 2.5;

      stars.push({
        x,
        y,
        size,
        hue: hueShift + Math.random() * 20 - 10,
        brightness: Math.random() * 0.3 + 0.7,
        twinkle: Math.random() * Math.PI * 2,
        driftAngle,
        driftSpeed: (Math.random() * 0.2 + 0.1) * starSpeed,
        initialRadius,
      });
    }
    starsRef.current = stars;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    container.innerHTML = '';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    let animationId: number;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!disableAnimation) {
        time += 0.008 * speed;
      }

      const stars = starsRef.current;

      stars.forEach((star, index) => {
        let currentRadius = star.initialRadius;
        let x = centerX + Math.cos(star.driftAngle) * currentRadius;
        let y = centerY + Math.sin(star.driftAngle) * currentRadius;

        if (!disableAnimation) {
          const driftOffset = time * star.driftSpeed * 5;
          currentRadius = star.initialRadius + driftOffset;

          if (currentRadius > maxDist) {
            // 重置星星到中心附近，并重新分配角度和速度
            star.initialRadius = Math.random() * 10;
            star.driftAngle = Math.random() * Math.PI * 2;
            star.driftSpeed = (Math.random() * 0.2 + 0.1) * starSpeed;
            currentRadius = star.initialRadius;
          }

          x = centerX + Math.cos(star.driftAngle) * currentRadius;
          y = centerY + Math.sin(star.driftAngle) * currentRadius;
        }

        if (mouseInteraction && isHovered) {
          const dx = mousePos.x - x;
          const dy = mousePos.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 300 && dist > 10) {
            const force = Math.pow((300 - dist) / 300, 1.5) * repulsionStrength * 0.8;
            x += (dx / dist) * force * 25;
            y += (dy / dist) * force * 25;
          }
        }

        const twinkleFactor = 0.7 + Math.sin(time * 0.3 + star.twinkle) * twinkleIntensity * 0.3;
        const brightness = Math.min(1, star.brightness * twinkleFactor);

        const hue = star.hue;
        const saturationValue = saturation * 50;

        const glowSize = star.size * (2 + glowIntensity * 5);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, `hsla(${hue}, ${saturationValue}%, ${brightness * 100}%, ${brightness})`);
        gradient.addColorStop(0.4, `hsla(${hue}, ${saturationValue}%, ${brightness * 70}%, ${brightness * 0.4})`);
        gradient.addColorStop(1, `hsla(${hue}, ${saturationValue}%, ${brightness * 40}%, 0)`);

        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        if (star.size > 1.2) {
          ctx.beginPath();
          ctx.arc(x, y, star.size * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${saturationValue}%, ${Math.min(100, brightness * 100)}%, ${brightness * 0.8})`;
          ctx.fill();
        }
      });

      if (!disableAnimation) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    const resizeObserver = new ResizeObserver(() => {
      const newWidth = container.offsetWidth;
      const newHeight = container.offsetHeight;
      canvas.width = newWidth;
      canvas.height = newHeight;
      render();
    });

    resizeObserver.observe(container);

    if (mouseInteraction) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', () => setIsHovered(true));
      container.addEventListener('mouseleave', () => setIsHovered(false));
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      resizeObserver.disconnect();
      if (mouseInteraction) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', () => setIsHovered(true));
        container.removeEventListener('mouseleave', () => setIsHovered(false));
      }
    };
  }, [
    focal, rotation, starSpeed, density, hueShift, disableAnimation, speed,
    mouseInteraction, glowIntensity, saturation, mouseRepulsion, twinkleIntensity,
    rotationSpeed, repulsionStrength, autoCenterRepulsion, handleMouseMove
  ]);

  return (
    <div
      ref={containerRef}
      className={`galaxy-container ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: transparent 
          ? 'transparent'
          : '#000000',
      }}
    />
  );
});

export default Galaxy;
