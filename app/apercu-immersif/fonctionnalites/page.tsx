import FeaturesPage from "@/app/fonctionnalites/page";
import { Mur } from "../Mur";

/**
 * La vraie page « Fonctionnalités », rendue telle quelle, avec le mur posé
 * sur sa bande de titre. Sert à juger le gabarit commun aux pages
 * intérieures, qui partagent presque toutes cette bande marine.
 */
export default function ApercuFonctionnalites() {
  return (
    <div className="apv-murpage">
      <FeaturesPage />
      <Mur />
    </div>
  );
}
