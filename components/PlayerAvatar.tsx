import { CHARACTERS } from "@/shared/characters.ts";
import type { Player } from "@/shared/types.ts";

export default function PlayerAvatar({ player }: { player: Player }) {
  const character = player.character ? CHARACTERS[player.character] : null;
  return (
    <div className="avatar" style={character ? { background: character.color } : undefined}>
      {character ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={character.image} alt={character.name} />
      ) : (
        player.name.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}
