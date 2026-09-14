/**
 * ShinyText — adapté de React Bits (David Haz, licence MIT + Commons Clause).
 * https://github.com/DavidHDev/react-bits
 *
 * Reflet qui glisse sur le texte. La version React Bits pilote le reflet
 * image par image en JavaScript ; celle-ci le confie à une animation CSS
 * (`@keyframes shine` dans globals.css), qui coûte moins et s'arrête
 * d'elle-même sous `prefers-reduced-motion`. Composant serveur : rien à
 * hydrater.
 */
export default function ShinyText({
  text,
  speed = 4,
  className = "",
  color = "currentColor",
  shineColor = "rgba(255, 255, 255, 0.85)",
}: {
  text: string;
  /** Durée d'un passage, en secondes. */
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
}) {
  return (
    <span
      className={`shiny-text ${className}`}
      style={{
        backgroundImage: `linear-gradient(120deg, ${color} 40%, ${shineColor} 50%, ${color} 60%)`,
        animationDuration: `${speed}s`,
      }}
    >
      {text}
    </span>
  );
}
