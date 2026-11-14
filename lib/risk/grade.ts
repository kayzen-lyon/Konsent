/**
 * Couleur d'une note de A à F. Module à part, sans dépendance : les
 * composants client (jauge, badge) l'importent sans embarquer le référentiel.
 */
export function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#15803d";
    case "B":
      return "#4d7c0f";
    case "C":
      return "#b45309";
    case "D":
      return "#c2410c";
    case "E":
      return "#ba1a1a";
    default:
      return "#7f1d1d";
  }
}
