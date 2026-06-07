// Cria formulário para cadastrar famílias.

import { useState } from "react";
import type { FormEvent } from "react";

import { createFamily } from "../services/api";
import { savePendingFamily } from "../services/offlineFamilies";
import type { Region } from "../types";

type FamilyFormProps = {
  regions: Region[];
  onFamilyCreated: () => Promise<void> | void;
  onOfflineFamilySaved: () => void;
};

export function FamilyForm({
  regions,
  onFamilyCreated,
  onOfflineFamilySaved,
}: FamilyFormProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const regionId = Number(formData.get("region_id"));
    const nomeResponsavel = String(formData.get("nome_responsavel") || "").trim();
    const quantidadeMoradores = Number(formData.get("quantidade_moradores") || 0);
    const codigoViela = String(formData.get("codigo_viela") || "").trim();

    if (!nomeResponsavel) {
      setError("Informe o nome do responsável.");
      return;
    }

    if (!quantidadeMoradores || quantidadeMoradores < 1) {
      setError("Informe a quantidade de moradores.");
      return;
    }

    if (!codigoViela) {
      setError("Informe o Código da Viela ou uma referência.");
      return;
    }

    if (!regionId) {
      setError("Selecione uma região.");
      return;
    }

    const payload = {
      ...(regionId ? { region_id: regionId } : {}),
      nome_responsavel: nomeResponsavel,
      telefone: String(formData.get("telefone") || ""),
      quantidade_moradores: quantidadeMoradores,
      codigo_viela: codigoViela,
      cep: String(formData.get("cep") || ""),
    };

    if (!navigator.onLine) {
      const result = savePendingFamily(payload);

      if (!result.saved && result.reason === "duplicate") {
        setError("Cadastro offline duplicado. Essa família já está aguardando sincronização.");
        return;
      }

      form.reset();
      setSuccess(
        "Sem conexão. Cadastro salvo localmente para sincronização futura.",
      );
      onOfflineFamilySaved();
      return;
    }

    try {
      await createFamily(payload);

      form.reset();
      setSuccess("Família mapeada com sucesso.");
      await onFamilyCreated();
    } catch (caughtError) {
      console.error("Erro ao cadastrar família:", caughtError);

      if (caughtError instanceof Error) {
        setError(caughtError.message);
        return;
      }

      setError("Não foi possível cadastrar a família.");
    }
  }

  return (
    <section className="panel">
      <h2>Cadastrar família</h2>

      {success && <p className="status success">{success}</p>}
      {error && <p className="status error">{error}</p>}
      {regions.length === 0 && (
        <p className="status warning">
          Nenhuma região ativa cadastrada. Cadastre uma região antes de mapear
          famílias.
        </p>
      )}

      <form className="family-form" onSubmit={handleSubmit} noValidate>
        <label>
          Nome do responsável
          <input name="nome_responsavel" placeholder="Ex: Ana Silva" required />
        </label>

        <label>
          Número de moradores
          <input
            name="quantidade_moradores"
            type="number"
            min="1"
            placeholder="Ex: 4"
            required
          />
        </label>

        <label>
          WhatsApp / telefone
          <input name="telefone" type="tel" placeholder="Ex: 81999990000" />
        </label>

        <label>
          Código da Viela / Referência
          <input name="codigo_viela" placeholder="Ex: Viela Azul" required />
        </label>

        <label>
          Região
          <select name="region_id" required disabled={regions.length === 0}>
            <option value="">Selecione uma região</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          CEP opcional
          <input name="cep" placeholder="Ex: 00000-000" />
        </label>

        <button type="submit" disabled={regions.length === 0}>
          Salvar família
        </button>
      </form>
    </section>
  );
}
