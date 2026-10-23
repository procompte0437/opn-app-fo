import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, FileText, Receipt, Loader2 } from 'lucide-react';
import { downloadFluxDocumentPdf, triggerBlobDownload } from '../../services/api';

export default function FluxPiecePdfModal({ piece, isOpen, onClose }) {
  const iframeRef = useRef(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [fichier, setFichier] = useState('');
  const [blobPdf, setBlobPdf] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!isOpen || !piece?.id) return undefined;
    let urlLocale = '';
    let annule = false;
    setChargement(true);
    setErreur('');
    setPdfUrl('');
    setBlobPdf(null);
    downloadFluxDocumentPdf(piece.id)
      .then(({ blob, filename }) => {
        if (annule) return;
        urlLocale = URL.createObjectURL(blob);
        setBlobPdf(blob);
        setFichier(filename || `${piece.numero || 'document'}.pdf`);
        setPdfUrl(urlLocale);
      })
      .catch((err) => {
        if (!annule) setErreur(err?.message || 'Impossible d’ouvrir le PDF.');
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
      if (urlLocale) URL.revokeObjectURL(urlLocale);
    };
  }, [isOpen, piece?.id, piece?.numero]);

  if (!isOpen || !piece) return null;

  const estFacture = piece.type === 'FACTURE';
  const titre = estFacture ? 'Facture OPN' : 'Bon de commande OPN';
  const Icone = estFacture ? Receipt : FileText;

  const imprimer = () => {
    const cadre = iframeRef.current;
    if (cadre?.contentWindow) {
      cadre.contentWindow.focus();
      cadre.contentWindow.print();
      return;
    }
    if (pdfUrl) {
      const onglet = window.open(pdfUrl, '_blank');
      onglet?.addEventListener('load', () => onglet.print());
    }
  };

  const telecharger = () => {
    if (!blobPdf) return;
    triggerBlobDownload(blobPdf, fichier || `${piece.numero || 'document'}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4">
      <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-md shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center shrink-0">
              <Icone className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{titre}</p>
              <p className="text-[11px] text-slate-300 font-mono truncate">{piece.numero}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={imprimer}
              disabled={!pdfUrl || chargement}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded border border-slate-600 hover:bg-slate-800 flex items-center gap-1 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </button>
            <button
              type="button"
              onClick={telecharger}
              disabled={!blobPdf || chargement}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-60 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Télécharger
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-slate-800" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {erreur && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-[11px] text-red-700">
            {erreur}
          </div>
        )}

        <div className="relative flex-1 min-h-0 bg-slate-200">
          {chargement && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-slate-600 bg-slate-100/80">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement du PDF…
            </div>
          )}
          {pdfUrl ? (
            <iframe
              ref={iframeRef}
              title={titre}
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            !chargement && !erreur && (
              <p className="p-6 text-sm text-slate-500 text-center">Aucun PDF à afficher.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
