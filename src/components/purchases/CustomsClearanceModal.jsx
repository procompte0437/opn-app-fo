import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Ship, 
  FileCheck, 
  AlertTriangle, 
  ThermometerSnowflake, 
  PackageCheck,
  Calendar,
  Anchor
} from 'lucide-react';

export default function CustomsClearanceModal({
  isOpen,
  onClose,
  purchaseOrder,
  onConfirmClearance,
}) {
  if (!isOpen || !purchaseOrder) return null;

  const po = purchaseOrder;
  const ship = po.shipping || {};

  const [numeroSydonia, setNumeroSydonia] = useState(`SYD-2026-OWE-${Math.floor(10000 + Math.random() * 90000)}`);
  const [bonAEnleverBAE, setBonAEnleverBAE] = useState(`BAE-DOUANE-${Math.floor(1000 + Math.random() * 9000)}`);
  const [coaConforme, setCoaConforme] = useState(true);
  const [temperatureArrivee, setTemperatureArrivee] = useState('18.5°C');
  const [temperatureConforme, setTemperatureConforme] = useState(true);
  const [scellesDouaneOk, setScellesDouaneOk] = useState(true);
  const [magasinDestination, setMagasinDestination] = useState('Magasin Central Hub Owendo (Bâtiment A - Zone Réception)');
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      onConfirmClearance({
        orderId: po.id,
        numeroSydonia,
        bonAEnleverBAE,
        coaConforme,
        temperatureArrivee,
        temperatureConforme,
        scellesDouaneOk,
        magasinDestination,
        dateDedouanement: new Date().toISOString(),
        observations,
        statut: 'RECEPTIONNE_MAGASIN',
      });
      setSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00A651]/20 border border-[#00A651] flex items-center justify-center text-[#00A651]">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#00A651] uppercase">Dédouanement Port d'Owendo</span>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Entrée en Douane : <span className="text-[#00A651]">{po.numeroCommande}</span>
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-700">
          
          {/* Shipping Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Navire / Vol</span>
              <p className="font-bold text-slate-900">{ship.navire || 'CMA CGM'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Connaissement (BL)</span>
              <p className="font-mono font-bold text-emerald-700">{ship.connaissementBL || 'BL-OWE-001'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Port de Départ</span>
              <p className="font-semibold text-slate-800">{ship.portDepart}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Port d'Arrivée</span>
              <p className="font-bold text-slate-900">{ship.portArrivee}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Conteneurs</span>
              <p className="font-semibold text-slate-800">{ship.nombreConteneurs}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Valeur Déclarée</span>
              <p className="font-mono font-bold text-slate-900">{po.montantTotalXaf?.toLocaleString('fr-FR')} XAF</p>
            </div>
          </div>

          {/* Customs Clearance Fields */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Formalités Douanières & Contrôle Pharmaceutique</span>
            </h4>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] text-emerald-900">
              <p className="font-bold mb-1">Dossier douanes Achats (présentation)</p>
              <p>Les Achats préparent la déclaration Sydonia / Cidonia, le BAE, les CoA et les pièces de franchise d’État avant intégration Owendo. L’Appro assure ensuite la distribution nationale.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  N° Déclaration Sydonia / Cidonia (Douanes)
                </label>
                <input
                  type="text"
                  value={numeroSydonia}
                  onChange={(e) => setNumeroSydonia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  N° Bon à Enlever (BAE Douanes)
                </label>
                <input
                  type="text"
                  value={bonAEnleverBAE}
                  onChange={(e) => setBonAEnleverBAE(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]"
                  required
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coaConforme}
                  onChange={(e) => setCoaConforme(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00A651] focus:ring-[#00A651]"
                />
                <span className="font-bold text-slate-800 text-[11px]">Certificat d'Analyse (CoA) conforme</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scellesDouaneOk}
                  onChange={(e) => setScellesDouaneOk(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00A651] focus:ring-[#00A651]"
                />
                <span className="font-bold text-slate-800 text-[11px]">Scellés conteneur intacts</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={temperatureConforme}
                  onChange={(e) => setTemperatureConforme(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00A651] focus:ring-[#00A651]"
                />
                <span className="font-bold text-slate-800 text-[11px]">Enregistreur thermique validé</span>
              </label>
            </div>

            {/* Destination Warehouse */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Magasin de Destination / Réception</label>
              <input
                type="text"
                value={magasinDestination}
                onChange={(e) => setMagasinDestination(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]"
                required
              />
            </div>

            {/* Observations */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Rapport de Visite & Observations</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
                placeholder="Ex: Dédouanement BAE accordé sans taxe sous régime d'exonération OPN. Transfert immédiat au Hub Central Owendo..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-[#00A651] hover:bg-[#008f45] text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <PackageCheck className="w-4 h-4" />
              <span>{submitting ? 'Validation en cours...' : 'Valider Dédouanement & Entrée en Stock'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
