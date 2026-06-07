import { ArrowLeft, User, Users } from "lucide-react";
import type { ReactNode } from "react";

type AppTopbarProps = {
  isEntry?: boolean;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onProfileClick?: () => void;
};

export function AppTopbar({
  isEntry = false,
  title,
  subtitle,
  onBack,
  onProfileClick,
}: AppTopbarProps) {
  return (
    <header className="pilar-topbar">
      {!isEntry && (
        <IconButton label="Voltar" onClick={onBack}>
          <ArrowLeft size={22} />
        </IconButton>
      )}

      <div className="brand-lockup">
        {isEntry && (
          <span className="brand-icon">
            <Users size={28} />
          </span>
        )}
        <div>
          {isEntry ? (
            <>
              <strong>PILAR</strong>
              <span>Sistema de distribuição de cestas básicas</span>
            </>
          ) : (
            <>
              <strong>{title}</strong>
              {subtitle && <span>{subtitle}</span>}
            </>
          )}
        </div>
      </div>

      {!isEntry && (
        <IconButton label="Perfil" variant="soft" onClick={onProfileClick}>
          <User size={22} />
        </IconButton>
      )}
    </header>
  );
}

type IconButtonProps = {
  children: ReactNode;
  label: string;
  variant?: "soft";
  onClick?: () => void;
};

function IconButton({ children, label, variant, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      className={variant === "soft" ? "icon-button soft" : "icon-button"}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
