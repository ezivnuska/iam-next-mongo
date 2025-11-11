// app/tiles/page.tsx

import DefaultPage from "../ui/layout/page/default-page";
import TileGame from "./tile-game";
import TileGameHeader from "./tile-game-header";

export default function Page() {
    return (
        <DefaultPage>
            <TileGameHeader />
            <TileGame />
        </DefaultPage>
    )
}