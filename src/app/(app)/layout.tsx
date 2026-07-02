import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { StoreHydrator } from "@/components/layout/StoreHydrator";
import { XPPopupLayer } from "@/components/progression/XPPopupLayer";
import { LevelUpModal } from "@/components/progression/LevelUpModal";
import { RankUpCeremony } from "@/components/progression/RankUpCeremony";
import { LadderPromotionToast } from "@/components/progression/LadderPromotionToast";
import { AchievementToast } from "@/components/progression/AchievementToast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreHydrator>
      <Sidebar />
      <MobileNav />
      <main className="md:pl-60 min-h-screen pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>

      <XPPopupLayer />
      <LevelUpModal />
      <LadderPromotionToast />
      <AchievementToast />
      <RankUpCeremony />
    </StoreHydrator>
  );
}
