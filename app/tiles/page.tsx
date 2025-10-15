// app/tiles/page.tsx

import TileGame from "./tile-game";
import TileGameHeader from "./tile-game-header";

export default function Page() {
    return (
        <>
            <TileGameHeader />
            <TileGame />
        </>
    )
}