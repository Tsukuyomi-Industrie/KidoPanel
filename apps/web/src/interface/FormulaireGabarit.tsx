import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { ChampGabaritDockerRapide } from "@kidopanel/container-catalog";

export type PropsFormulaireGabarit = {
  readonly champs: readonly ChampGabaritDockerRapide[];
  /** Valeurs initiales pré-remplies depuis les défauts du gabarit. */
  readonly valeursInitiales: Record<string, string>;
  /** Libellé du bouton de soumission. */
  readonly libelleAction: string;
  /** Indique si la soumission est en cours. */
  readonly enCours: boolean;
  readonly messageErreur: string | null;
  readonly onSubmit: (valeurs: Record<string, string>) => void;
};

/**
 * Formulaire piloté par le catalogue : génère les contrôles HTML selon les métadonnées des champs,
 * sans logique métier ni affichage JSON.
 */
export function FormulaireGabarit({
  champs,
  valeursInitiales,
  libelleAction,
  enCours,
  messageErreur,
  onSubmit,
}: Readonly<PropsFormulaireGabarit>) {
  const [valeurs, setValeurs] = useState<Record<string, string>>(() => ({
    ...valeursInitiales,
  }));
  const [erreursChamp, setErreursChamp] = useState<Record<string, string>>({});

  const cleListe = useMemo(
    () =>
      champs
        .map((c) => c.cle)
        .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
        .join("|"),
    [champs],
  );

  useEffect(() => {
    setValeurs({ ...valeursInitiales });
    setErreursChamp({});
  }, [valeursInitiales, cleListe]);

  const majValeur = useCallback((cle: string, valeur: string) => {
    setValeurs((prev) => ({ ...prev, [cle]: valeur }));
    setErreursChamp((prev) => {
      if (!(cle in prev)) {
        return prev;
      }
      const suivant = { ...prev };
      delete suivant[cle];
      return suivant;
    });
  }, []);

  const gererSoumission = useCallback(
    (ev: FormEvent) => {
      ev.preventDefault();
      const suivantes: Record<string, string> = {};
      for (const champ of champs) {
        const brut = (valeurs[champ.cle] ?? "").trim();
        if (champ.requis && brut === "") {
          suivantes[champ.cle] = "Ce champ est obligatoire.";
        }
      }
      setErreursChamp(suivantes);
      if (Object.keys(suivantes).length > 0) {
        return;
      }
      const final: Record<string, string> = {};
      for (const champ of champs) {
        final[champ.cle] = valeurs[champ.cle] ?? "";
      }
      onSubmit(final);
    },
    [champs, onSubmit, valeurs],
  );

  return (
    <form className="form-auth-kido" onSubmit={gererSoumission}>
      {champs.map((champ) => {
        const texteErreur = erreursChamp[champ.cle] ?? "";
        const idChamp = `kp-fg-${champ.cle}`;
        const classeLabel =
          champ.requis === true ? "kp-champ__label kp-champ__label--requis" : "kp-champ__label";
        return (
          <div className="kp-champ" key={champ.cle}>
            <label className={classeLabel} htmlFor={idChamp}>
              {champ.label}
            </label>
            {champ.type === "select" ? (
              <select
                id={idChamp}
                value={valeurs[champ.cle] ?? champ.defaut ?? ""}
                onChange={(e) => majValeur(champ.cle, e.target.value)}
              >
                {(champ.options ?? []).map((opt) => (
                  <option key={opt.valeur} value={opt.valeur}>
                    {opt.libelle}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={idChamp}
                type={champ.type === "number" ? "number" : champ.type}
                value={valeurs[champ.cle] ?? champ.defaut ?? ""}
                min={champ.type === "number" ? champ.min : undefined}
                max={champ.type === "number" ? champ.max : undefined}
                onChange={(e) => majValeur(champ.cle, e.target.value)}
              />
            )}
            {champ.aide !== undefined ? (
              <p className="kp-champ__aide">{champ.aide}</p>
            ) : null}
            {texteErreur.length > 0 ? (
              <p className="kp-champ__erreur" role="alert">
                {texteErreur}
              </p>
            ) : null}
          </div>
        );
      })}
      {messageErreur !== null ? (
        <div className="bandeau-erreur-auth" role="alert">
          {messageErreur}
        </div>
      ) : null}
      <button type="submit" className="bouton-principal-kido" disabled={enCours}>
        {enCours ? "Patience…" : libelleAction}
      </button>
    </form>
  );
}
