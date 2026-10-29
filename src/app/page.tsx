import Board from "@/components/hero/Board";
import Work from "@/components/work/Work";
import TestBench from "@/components/bench/TestBench";
import LayerZero from "@/components/about/LayerZero";
import TitleBlock from "@/components/contact/TitleBlock";
import SiteNav from "@/components/nav/SiteNav";
import XRay from "@/components/xray/XRay";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main id="top">
        <Board />
        <Work />
        <TestBench />
        <LayerZero />
      </main>
      <TitleBlock />
      <XRay />
    </>
  );
}
