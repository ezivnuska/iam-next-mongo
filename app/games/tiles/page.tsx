// app/tiles/page.tsx

import FullscreenPage from "@/app/ui/layout/page/fullscreen-page";
import FullscreenPageWithHeader from "../../ui/layout/page/fullscreen-page-with-header";
import TileGame from "./tile-game";
import OverlayPage from "@/app/ui/layout/page/overlay-page";
import DefaultPage from "@/app/ui/layout/page/default-page";

export default function Page() {
    return (
        // <FullscreenPage>
        <DefaultPage>
            <TileGame />
        </DefaultPage>
        // </FullscreenPage>
    )
}