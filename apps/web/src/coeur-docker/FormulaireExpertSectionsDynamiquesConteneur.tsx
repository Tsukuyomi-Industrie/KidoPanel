import type { EtatFormulaireExpertConteneur } from "./etat-formulaire-expert-conteneur.js";
import {
  ajouterLigneEnvExpert,
  ajouterLignePortExpert,
  ajouterLigneSysctlExpert,
  ajouterLigneVolumeExpert,
} from "./etat-formulaire-expert-conteneur.js";

type PropsSections = {
  readonly etat: EtatFormulaireExpertConteneur;
  readonly surChangement: (suivant: EtatFormulaireExpertConteneur) => void;
};

/**
 * Sections repliables pour listes dynamiques : ports, variables d'environnement, volumes et sysctl.
 */
export function FormulaireExpertSectionsDynamiquesConteneur({
  etat,
  surChangement,
}: PropsSections) {
  return (
    <>
      <details className="kp-details-section">
        <summary>Ports</summary>
        <div className="kp-details-section__corps">
          {etat.lignesPorts.map((ligne) => (
            <div className="kp-rangee-expert" key={ligne.id}>
              <input
                type="number"
                min={1}
                max={65535}
                placeholder="Port conteneur"
                aria-label="Port conteneur"
                value={ligne.portConteneur}
                onChange={(e) =>
                  surChangement({
                    ...etat,
                    lignesPorts: etat.lignesPorts.map((x) =>
                      x.id === ligne.id
                        ? { ...x, portConteneur: e.target.value }
                        : x,
                    ),
                  })
                }
              />
              <input
                type="number"
                min={1}
                max={65535}
                placeholder="Port hôte"
                aria-label="Port hôte"
                value={ligne.portHote}
                onChange={(e) =>
                  surChangement({
                    ...etat,
                    lignesPorts: etat.lignesPorts.map((x) =>
                      x.id === ligne.id ? { ...x, portHote: e.target.value } : x,
                    ),
                  })
                }
              />
              <label className="kp-inline-radio">
                <input
                  type="radio"
                  name={`proto-${ligne.id}`}
                  checked={ligne.protocole === "tcp"}
                  onChange={() =>
                    surChangement({
                      ...etat,
                      lignesPorts: etat.lignesPorts.map((x) =>
                        x.id === ligne.id ? { ...x, protocole: "tcp" } : x,
                      ),
                    })
                  }
                />{" "}
                TCP
              </label>
              <label className="kp-inline-radio">
                <input
                  type="radio"
                  name={`proto-${ligne.id}`}
                  checked={ligne.protocole === "udp"}
                  onChange={() =>
                    surChangement({
                      ...etat,
                      lignesPorts: etat.lignesPorts.map((x) =>
                        x.id === ligne.id ? { ...x, protocole: "udp" } : x,
                      ),
                    })
                  }
                />{" "}
                UDP
              </label>
              <button
                type="button"
                className="bouton-secondaire-kido"
                onClick={() =>
                  surChangement({
                    ...etat,
                    lignesPorts: etat.lignesPorts.filter((x) => x.id !== ligne.id),
                  })
                }
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            type="button"
            className="bouton-secondaire-kido"
            onClick={() => surChangement(ajouterLignePortExpert(etat))}
          >
            Ajouter un port
          </button>
        </div>
      </details>

      <details className="kp-details-section">
        <summary>Variables d'environnement</summary>
        <div className="kp-details-section__corps">
          {etat.lignesEnv.map((ligne) => (
            <div className="kp-rangee-expert" key={ligne.id}>
              <input
                type="text"
                placeholder="Nom de la variable"
                aria-label="Nom de la variable"
                value={ligne.cle}
                onChange={(e) =>
                  surChangement({
                    ...etat,
                    lignesEnv: etat.lignesEnv.map((x) =>
                      x.id === ligne.id ? { ...x, cle: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                type="text"
                placeholder="Valeur"
                aria-label="Valeur de la variable"
                value={ligne.valeur}
                onChange={(e) =>
                  surChangement({
                    ...etat,
                    lignesEnv: etat.lignesEnv.map((x) =>
                      x.id === ligne.id ? { ...x, valeur: e.target.value } : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="bouton-secondaire-kido"
                onClick={() =>
                  surChangement({
                    ...etat,
                    lignesEnv: etat.lignesEnv.filter((x) => x.id !== ligne.id),
                  })
                }
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            type="button"
            className="bouton-secondaire-kido"
            onClick={() => surChangement(ajouterLigneEnvExpert(etat))}
          >
            Ajouter une variable
          </button>
        </div>
      </details>

      <details className="kp-details-section">
        <summary>Volumes</summary>
        <div className="kp-details-section__corps">
          {etat.lignesVolumes.map((ligne) => (
            <div className="kp-rangee-expert" key={ligne.id}>
              <input
                type="text"
                placeholder="Chemin sur l'hôte"
                aria-label="Chemin sur l'hôte"
                value={ligne.cheminHote}
                onChange={(e) =>
                  surChangement({
                    ...etat,
                    lignesVolumes: etat.lignesVolumes.map((x) =>
                      x.id === ligne.id ? { ...x, cheminHote: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                type="text"
                placeholder="Chemin dans le conteneur"
                aria-label="Chemin dans le conteneur"
                value={ligne.cheminConteneur}
                onChange={(e) =>
                  surChangement({
                    ...etat,
                    lignesVolumes: etat.lignesVolumes.map((x) =>
                      x.id === ligne.id
                        ? { ...x, cheminConteneur: e.target.value }
                        : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="bouton-secondaire-kido"
                onClick={() =>
                  surChangement({
                    ...etat,
                    lignesVolumes: etat.lignesVolumes.filter((x) => x.id !== ligne.id),
                  })
                }
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            type="button"
            className="bouton-secondaire-kido"
            onClick={() => surChangement(ajouterLigneVolumeExpert(etat))}
          >
            Ajouter un volume
          </button>
        </div>
      </details>

      <details className="kp-details-section">
        <summary>Paramètres sysctl</summary>
        <div className="kp-details-section__corps">
          {etat.lignesSysctl.map((ligne) => (
            <div className="kp-rangee-expert" key={ligne.id}>
              <input
                type="text"
                placeholder="sysctl"
                aria-label="Clé sysctl"
                value={ligne.cle}
                onChange={(e) =>
                  surChangement({
                    ...etat,
                    lignesSysctl: etat.lignesSysctl.map((x) =>
                      x.id === ligne.id ? { ...x, cle: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                type="text"
                placeholder="Valeur"
                aria-label="Valeur sysctl"
                value={ligne.valeur}
                onChange={(e) =>
                  surChangement({
                    ...etat,
                    lignesSysctl: etat.lignesSysctl.map((x) =>
                      x.id === ligne.id ? { ...x, valeur: e.target.value } : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="bouton-secondaire-kido"
                onClick={() =>
                  surChangement({
                    ...etat,
                    lignesSysctl: etat.lignesSysctl.filter((x) => x.id !== ligne.id),
                  })
                }
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            type="button"
            className="bouton-secondaire-kido"
            onClick={() => surChangement(ajouterLigneSysctlExpert(etat))}
          >
            Ajouter une variable sysctl
          </button>
        </div>
      </details>
    </>
  );
}
