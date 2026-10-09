
import Animation from "./Appearance/Animation";
import Grain from "./Appearance/Grain";
import LockScreen from "./Appearance/LockScreen";
import Theme from "./Appearance/Theme";
import Wallpaper from "./Appearance/Wallpaper";

export default function Appearance() {
  return (
    <div className="space-y-2.5">
      <h2 className="text-base font-bold tracking-tight">Appearance</h2>
      <Wallpaper />
      <LockScreen />
      <Animation />
      <Grain />
      <Theme />
    </div>
  );
}
