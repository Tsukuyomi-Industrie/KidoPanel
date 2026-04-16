import { BlocIdentiteEtCommandeCreationConteneurLab } from "./BlocIdentiteEtCommandeCreationConteneurLab.js";
import { BlocReseauEtEnvironnementCreationConteneurLab } from "./BlocReseauEtEnvironnementCreationConteneurLab.js";
import { BlocSecuriteRessourcesEtJsonCreationConteneurLab } from "./BlocSecuriteRessourcesEtJsonCreationConteneurLab.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import { styleBlocLab } from "./stylesCommunsLab.js";

type Props = {
  etat: EtatCreationConteneurLab;
  majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
  surCreer: () => void;
};

/** Formulaire avancé de création (image, commande, réseau, ressources, JSON santé / réseau / host). */
export function SectionCreationConteneurAvanceLab({
  etat,
  majEtat,
  surCreer,
}: Props) {
  return (
    <section style={styleBlocLab}>
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>
        Créer un conteneur (paramétrage étendu)
      </h2>
      <p style={{ fontSize: "0.88rem", opacity: 0.88, marginTop: 0 }}>
        Champs alignés sur l’API Docker via le moteur : liaisons{" "}
        <code>80/tcp=8080</code> ou <code>80/tcp=127.0.0.1:8080</code> (une par ligne) ;
        variables et étiquettes au format <code>CLE=VALEUR</code> par ligne. Les blocs JSON
        facultatifs sont fusionnés ou envoyés tels quels après validation côté serveur.
      </p>

      <BlocIdentiteEtCommandeCreationConteneurLab etat={etat} majEtat={majEtat} />
      <BlocReseauEtEnvironnementCreationConteneurLab etat={etat} majEtat={majEtat} />
      <BlocSecuriteRessourcesEtJsonCreationConteneurLab etat={etat} majEtat={majEtat} />

      <button type="button" onClick={() => void surCreer()}>
        Créer le conteneur
      </button>
    </section>
  );
}
