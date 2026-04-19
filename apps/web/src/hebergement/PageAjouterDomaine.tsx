import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ajouterDomaineProxyPasserelle,
  rechargerProxyPasserelle,
} from "../passerelle/serviceProxyManagerPasserelle.js";
import {
  listerWebInstancesPasserelle,
  type WebInstancePasserelle,
} from "../passerelle/serviceWebInstancesPasserelle.js";
import { useToastKidoPanel } from "../interface/useToastKidoPanel.js";

/** Formulaire d’association d’un domaine à une instance web active. */
export function PageAjouterDomaine() {
  const navigate = useNavigate();
  const { pousserToast } = useToastKidoPanel();
  const [instances, setInstances] = useState<WebInstancePasserelle[]>([]);
  const [domaine, setDomaine] = useState("");
  const [idInstance, setIdInstance] = useState("");
  const [port, setPort] = useState(80);
  const [patient, setPatient] = useState(false);

  useEffect(() => {
    listerWebInstancesPasserelle()
      .then((liste) => {
        setInstances(liste.filter((i) => i.status === "RUNNING"));
        if (liste[0]?.id !== undefined) {
          setIdInstance(liste[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ligne = instances.find((i) => i.id === idInstance);
    if (ligne?.techStack === "NODE_JS") {
      setPort(3000);
    } else if (ligne?.techStack === "PHP_FPM") {
      setPort(9000);
    } else {
      setPort(80);
    }
  }, [idInstance, instances]);

  const gererSoumission = async (ev: FormEvent) => {
    ev.preventDefault();
    const dom = domaine.trim().toLowerCase();
    if (!dom || !idInstance.trim()) {
      pousserToast("Domaine et container obligatoires.", "erreur");
      return;
    }
    setPatient(true);
    try {
      await ajouterDomaineProxyPasserelle({
        domaine: dom,
        webInstanceId: idInstance.trim(),
        portCible: port,
      });
      await rechargerProxyPasserelle();
      pousserToast("Domaine ajouté et proxy rechargé.", "succes");
      navigate("/hebergement/proxy");
    } catch (error_) {
      pousserToast(error_ instanceof Error ? error_.message : "Ajout impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  return (
    <>
      <p className="kp-texte-muted">
        <Link to="/hebergement/proxy" className="kp-lien-inline">
          Proxy Manager
        </Link>
      </p>
      <div className="kp-page-entete">
        <h1 className="kp-page-titre">Ajouter un domaine</h1>
      </div>
      <form className="kp-panel-corps form-auth-kido" onSubmit={(e) => gererSoumission(e).catch(() => {})}>
        <label className="kp-section-label" htmlFor="dom">
          Domaine
        </label>
        <input
          id="dom"
          className="champ-auth-kido"
          value={domaine}
          onChange={(e) => setDomaine(e.target.value)}
          placeholder="ex. mon-site.fr"
          autoComplete="off"
        />
        <label className="kp-section-label" htmlFor="wi">
          Container cible
        </label>
        <select
          id="wi"
          className="champ-auth-kido"
          value={idInstance}
          onChange={(e) => setIdInstance(e.target.value)}
        >
          {instances.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.techStack})
            </option>
          ))}
        </select>
        <label className="kp-section-label" htmlFor="port">
          Port interne
        </label>
        <input
          id="port"
          type="number"
          min={1}
          max={65535}
          className="champ-auth-kido"
          value={port}
          onChange={(e) => setPort(Number(e.target.value))}
        />
        <button type="submit" className="kp-btn kp-btn--primaire kp-marges-haut-sm" disabled={patient}>
          Ajouter le domaine
        </button>
      </form>
    </>
  );
}
