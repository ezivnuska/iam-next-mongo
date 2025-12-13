// app/tiles/page.tsx

import FullscreenPageWithHeader from "../../ui/layout/page/fullscreen-page-with-header";
import TileGame from "./tile-game";

export default function Page() {
    return (
        <FullscreenPageWithHeader>
            <TileGame />
        </FullscreenPageWithHeader>
    )
}