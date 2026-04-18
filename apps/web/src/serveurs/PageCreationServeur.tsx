import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { creerInstanceServeurJeuxPasserelle } from "../passerelle/serviceServeursJeuxPasserelle.js";
import { VALEURS_TYPE_JEU_INSTANCE_PANEL } from "./types-instance-jeu-panel.js";

/**
 * Assistant minimal de création d’instance jeu (corps aligné sur `POST /instances` du service).
 */
export function PageCreationServeur() {
  const idBase = useId();
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [gameType, setGameType] = useState<string>("MINECRAFT_JAVA");
  const [memoryMb, setMemoryMb] = useState(3072);
  const [cpuCores, setCpuCores] = useState(2);
  const [diskGb, setDiskGb] = useState(20);
  const [envJson, setEnvJson] = useState('{"EULA":"TRUE"}');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  return (
    <div className="kidopanel-page-centree">
      <p className="kidopanel-texte-muted">
        <Link to="/serveurs" className="kidopanel-lien-bouton-secondaire">
          Retour à la liste
        </Link>
      </p>
      <h1 className="kidopanel-titre-page">Nouveau serveur de jeu</h1>
      <p className="kidopanel-sous-titre-page">
        Les variables d’environnement dépendent du jeu (ex. EULA pour Minecraft Java). Consultez le gabarit dans le dépôt.
      </p>
      <section className="kidopanel-carte-principale" style={{ marginTop: "1rem" }}>
        <form
          className="form-auth-kido"
          onSubmit={(ev) => {
            ev.preventDefault();
            setErreur(null);
            let envParse: Record<string, string> | undefined;
            if (envJson.trim() !== "") {
              try {
                const brut = JSON.parse(envJson) as unknown;
                if (typeof brut !== "object" || brut === null || Array.isArray(brut)) {
                  throw new Error("L’environnement doit être un objet JSON.");
                }
                envParse = {};
                for (const [cle, valeur] of Object.entries(brut as Record<string, unknown>)) {
                  envParse[cle] = String(valeur);
                }
              } catch (e) {
                setErreur(e instanceof Error ? e.message : "JSON environnement invalide.");
                return;
              }
            }
            setEnCours(true);
            void (async () => {
              try {
                const cree = await creerInstanceServeurJeuxPasserelle({
                  name: nom.trim(),
                  gameType,
                  memoryMb,
                  cpuCores,
                  diskGb,
                  ...(envParse !== undefined ? { env: envParse } : {}),
                });
                void navigate(`/serveurs/${encodeURIComponent(cree.id)}`, { replace: true });
              } catch (e) {
                setErreur(e instanceof Error ? e.message : "Création refusée.");
              } finally {
                setEnCours(false);
              }
            })();
          }}
        >
          <div className="champ-auth-kido">
            <label htmlFor={`${idBase}-nom`}>Nom affiché</label>
            <input
              id={`${idBase}-nom`}
              type="text"
              value={nom}
              onChange={(ev) => setNom(ev.target.value)}
              required
              minLength={1}
              maxLength={255}
            />
          </div>
          <div className="champ-auth-kido">
            <label htmlFor={`${idBase}-jeu`}>Type de jeu</label>
            <select
              id={`${idBase}-jeu`}
              value={gameType}
              onChange={(ev) => setGameType(ev.target.value)}
            >
              {VALEURS_TYPE_JEU_INSTANCE_PANEL.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="champ-auth-kido">
            <label htmlFor={`${idBase}-memoire`}>Mémoire (Mo)</label>
            <input
              id={`${idBase}-memoire`}
              type="number"
              min={256}
              max={524288}
              value={memoryMb}
              onChange={(ev) => setMemoryMb(Number(ev.target.value))}
              required
            />
          </div>
          <div className="champ-auth-kido">
            <label htmlFor={`${idBase}-cpu`}>CPU (cœurs)</label>
            <input
              id={`${idBase}-cpu`}
              type="number"
              min={0.25}
              max={512}
              step={0.25}
              value={cpuCores}
              onChange={(ev) => setCpuCores(Number(ev.target.value))}
              required
            />
          </div>
          <div className="champ-auth-kido">
            <label htmlFor={`${idBase}-disque`}>Disque (Go)</label>
            <input
              id={`${idBase}-disque`}
              type="number"
              min={1}
              max={10000}
              value={diskGb}
              onChange={(ev) => setDiskGb(Number(ev.target.value))}
              required
            />
          </div>
          <div className="champ-auth-kido">
            <label htmlFor={`${idBase}-env`}>Variables d’environnement (JSON objet clé/valeur texte)</label>
            <textarea
              id={`${idBase}-env`}
              rows={6}
              value={envJson}
              onChange={(ev) => setEnvJson(ev.target.value)}
              spellCheck={false}
            />
          </div>
          {erreur !== null ? (
            <div className="bandeau-erreur-auth" role="alert">
              {erreur}
            </div>
          ) : null}
          <button type="submit" className="bouton-principal-kido" disabled={enCours}>
            {enCours ? "Création…" : "Créer l’instance"}
          </button>
        </form>
      </section>
    </div>
  );
}
