import { FileWarning, Shield, User, Users } from "lucide-react";

type EntryScreenProps = {
  onSelectPresident: () => void;
  onSelectResident: () => void;
  onSelectAdmin: () => void;
  onSelectComplaint: () => void;
};

export function EntryScreen({
  onSelectPresident,
  onSelectResident,
  onSelectAdmin,
  onSelectComplaint,
}: EntryScreenProps) {
  return (
    <main className="pilar-gradient entry-screen">
      <section className="entry-content">
        <div className="entry-brand">
          <h1>PILAR</h1>
          <p>Sistema de distribuição de cestas básicas</p>
        </div>

        <div className="role-grid" aria-label="Selecionar perfil">
          <button
            type="button"
            className="role-card"
            data-testid="entry-president"
            onClick={onSelectPresident}
          >
            <span className="tile-icon">
              <Users size={34} />
            </span>
            <strong>Presidente de Rua</strong>
            <small>Cadastrar e entregar cestas básicas</small>
          </button>

          <button
            type="button"
            className="role-card"
            data-testid="entry-resident"
            onClick={onSelectResident}
          >
            <span className="tile-icon">
              <User size={34} />
            </span>
            <strong>Morador</strong>
            <small>Monitorar seu histórico</small>
          </button>

          <button
            type="button"
            className="role-card"
            data-testid="entry-admin"
            onClick={onSelectAdmin}
          >
            <span className="tile-icon">
              <Shield size={34} />
            </span>
            <strong>Administrador</strong>
            <small>Gerenciar todo o sistema</small>
          </button>
        </div>

        <button
          type="button"
          className="complaint-entry"
          data-testid="entry-complaint"
          onClick={onSelectComplaint}
        >
          <FileWarning size={22} />
          <span>Ouvidoria Anônima</span>
        </button>
        <p className="entry-note">Registre denúncias sem precisar fazer login</p>
      </section>
    </main>
  );
}
