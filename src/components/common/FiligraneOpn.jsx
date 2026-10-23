import React from 'react';

const TEXTE = 'OPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPNOPN';
const LIGNES = Array.from({ length: 90 }, (_, index) => index);

const STYLE_COUCHE = [
  'position:absolute',
  'inset:0',
  'overflow:hidden',
  'pointer-events:none',
  'z-index:2',
].join(';');

const STYLE_GRILLE = [
  'position:absolute',
  'left:-90%',
  'top:-90%',
  'width:280%',
  'height:280%',
  'display:flex',
  'flex-direction:column',
  'justify-content:flex-start',
  'gap:3px',
  'transform:rotate(-28deg)',
  'transform-origin:center center',
  'filter:blur(0.4px)',
].join(';');

const STYLE_LIGNE = [
  'font-size:10px',
  'font-weight:700',
  'letter-spacing:0.02em',
  'color:rgba(120,120,120,0.28)',
  'line-height:1',
  'white-space:nowrap',
  'font-family:Arial,Helvetica,sans-serif',
].join(';');

function appliquerGrille(grille) {
  grille.style.cssText = STYLE_GRILLE;
  LIGNES.forEach((index) => {
    const ligne = document.createElement('span');
    ligne.textContent = TEXTE;
    ligne.style.cssText = `${STYLE_LIGNE};margin-left:${index % 2 === 0 ? '0' : '12px'}`;
    grille.appendChild(ligne);
  });
}

/** Bandes « OPN » grises, petites, serrées, sur toute la feuille. */
export function creerNoeudFiligrane() {
  const couche = document.createElement('div');
  couche.setAttribute('data-filigrane-opn', '');
  couche.setAttribute('aria-hidden', 'true');
  couche.style.cssText = STYLE_COUCHE;
  const grille = document.createElement('div');
  appliquerGrille(grille);
  couche.appendChild(grille);
  return couche;
}

/** Pose le filigrane dans un document s’il n’y est pas déjà. Retourne une fonction de retrait. */
export function assurerFiligrane(element) {
  if (!element || element.querySelector('[data-filigrane-opn]')) return () => {};
  const positionCalculee = window.getComputedStyle(element).position;
  const positionPrecedente = element.style.position;
  if (positionCalculee === 'static') element.style.position = 'relative';
  const noeud = creerNoeudFiligrane();
  element.appendChild(noeud);
  return () => {
    noeud.remove();
    element.style.position = positionPrecedente;
  };
}

export default function FiligraneOpn() {
  return (
    <div
      data-filigrane-opn=""
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{ zIndex: 2 }}
    >
      <div
        className="absolute flex flex-col"
        style={{
          left: '-90%',
          top: '-90%',
          width: '280%',
          height: '280%',
          gap: '3px',
          transform: 'rotate(-28deg)',
          transformOrigin: 'center center',
          filter: 'blur(0.4px)',
        }}
      >
        {LIGNES.map((index) => (
          <span
            key={index}
            className="font-bold whitespace-nowrap leading-none"
            style={{
              marginLeft: index % 2 === 0 ? 0 : '12px',
              fontSize: '10px',
              letterSpacing: '0.02em',
              color: 'rgba(120,120,120,0.28)',
              fontFamily: 'Arial, Helvetica, sans-serif',
            }}
          >
            {TEXTE}
          </span>
        ))}
      </div>
    </div>
  );
}
