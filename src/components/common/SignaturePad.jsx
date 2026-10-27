import React, { useEffect, useRef, useState } from 'react';

/**
 * Pad de signature tactile / souris pour BL et visas dans l'application.
 * Expose getDataUrl() via onReady, ou lecture via ref.current.toDataURL().
 */
export default function SignaturePad({
  height = 160,
  className = '',
  onChange,
  label = 'Signez dans le cadre ci-dessous',
}) {
  const canvasRef = useRef(null);
  const dessin = useRef(false);
  const [vide, setVide] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const largeur = canvas.clientWidth || 400;
    canvas.width = largeur * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, largeur, height);
    return undefined;
  }, [height]);

  function point(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = e.touches?.[0] || e;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  }

  function demarrer(e) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = point(e);
    dessin.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function tracer(e) {
    if (!dessin.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setVide(false);
    onChange?.(canvas.toDataURL('image/png'));
  }

  function arreter() {
    dessin.current = false;
  }

  function effacer() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const largeur = canvas.clientWidth || 400;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    const ratio = window.devicePixelRatio || 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, largeur, height);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    setVide(true);
    onChange?.('');
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-600">{label}</p>
        <button
          type="button"
          onClick={effacer}
          className="text-[10px] font-bold text-rose-600 hover:underline"
        >
          Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded border-2 border-dashed border-slate-300 bg-white cursor-crosshair"
        style={{ height }}
        onMouseDown={demarrer}
        onMouseMove={tracer}
        onMouseUp={arreter}
        onMouseLeave={arreter}
        onTouchStart={demarrer}
        onTouchMove={tracer}
        onTouchEnd={arreter}
      />
      <p className="text-[10px] text-slate-400">
        {vide ? 'Aucune signature — dessinez avec la souris ou le doigt.' : 'Signature capturée dans l’application.'}
      </p>
    </div>
  );
}

export function signatureVide(dataUrl) {
  return !dataUrl || dataUrl.length < 80;
}
