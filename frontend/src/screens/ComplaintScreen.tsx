import { AnonymousComplaintForm } from "../components/AnonymousComplaintForm";
import { AppTopbar } from "../components/ui/AppTopbar";
import type { Region } from "../types";

type ComplaintScreenProps = {
  regions: Region[];
  onBack: () => void;
};

export function ComplaintScreen({ regions, onBack }: ComplaintScreenProps) {
  return (
    <main className="pilar-gradient app-screen">
      <AppTopbar
        title="Ouvidoria Anônima"
        subtitle="Registro protegido"
        onBack={onBack}
        onProfileClick={onBack}
      />

      <section className="screen-content narrow">
        <AnonymousComplaintForm regions={regions} />
      </section>
    </main>
  );
}
