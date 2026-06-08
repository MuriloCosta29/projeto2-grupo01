import type { ChangeEvent } from "react";
import { CheckCircle2, Download, Upload } from "lucide-react";

import { FamilyForm } from "../components/FamilyForm";
import { AppTopbar } from "../components/ui/AppTopbar";
import type { Region } from "../types";

type FamilyCreateScreenProps = {
  regions: Region[];
  pendingOfflineFamiliesCount: number;
  offlineSyncMessage: string;
  onBack: () => void;
  onFamilyCreated: () => void;
  onOfflineFamilySaved: () => void;
  onDownloadBackup: () => void;
  onRestoreBackup: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function FamilyCreateScreen({
  regions,
  pendingOfflineFamiliesCount,
  offlineSyncMessage,
  onBack,
  onFamilyCreated,
  onOfflineFamilySaved,
  onDownloadBackup,
  onRestoreBackup,
}: FamilyCreateScreenProps) {
  return (
    <main className="pilar-gradient app-screen">
      <AppTopbar
        title="Cadastrar Nova Família"
        subtitle="Preencha os dados abaixo"
        onBack={onBack}
        onProfileClick={onBack}
      />

      <section className="screen-content narrow">
        <FamilyForm
          regions={regions}
          onFamilyCreated={onFamilyCreated}
          onOfflineFamilySaved={onOfflineFamilySaved}
        />

        <section className="offline-card">
          <div>
            <CheckCircle2 size={18} />
            <span>
              {pendingOfflineFamiliesCount > 0
                ? `${pendingOfflineFamiliesCount} cadastro(s) offline aguardando sincronização.`
                : "Dados salvos automaticamente no dispositivo em modo offline."}
            </span>
          </div>
          <div className="backup-actions">
            <button
              type="button"
              onClick={onDownloadBackup}
              disabled={pendingOfflineFamiliesCount === 0}
            >
              <Download size={18} />
              Backup
            </button>
            <label>
              <Upload size={18} />
              Restaurar
              <input
                type="file"
                accept="application/json"
                onChange={onRestoreBackup}
              />
            </label>
          </div>
          {offlineSyncMessage && <p>{offlineSyncMessage}</p>}
        </section>
      </section>
    </main>
  );
}
