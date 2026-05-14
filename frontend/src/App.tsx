import { useEffect, useState } from "react";

import "./App.css";
import { FamilyList } from "./components/FamilyList";
import { FamilyForm } from "./components/FamilyForm.tsx";
import { getFamilies } from "./services/api";
import type { Family } from "./types";

function App() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

function loadFamilies() {
  setLoading(true);

  getFamilies()
    .then((data) => {
      setFamilies(data);
      setError("");
    })
    .catch(() => {
      setError("Não foi possível carregar as famílias.");
    })
    .finally(() => {
      setLoading(false);
    });
}

useEffect(() => {
  loadFamilies();
}, []);

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Presidente de Rua</p>
        <h1>Cadastro Familiar</h1>
        <p>
          Sistema de apoio ao Presidente de Rua para mapear famílias sem CEP
          oficial, evitar duplicidade e consultar histórico de entregas.
        </p>
      </section>

      {loading && <p className="status">Carregando famílias...</p>}
      {error && <p className="status error">{error}</p>}

      <FamilyForm onFamilyCreated={loadFamilies} />

      {!loading && !error && <FamilyList families={families} />}
    </main>
  );
}

export default App;

