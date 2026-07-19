import { useState } from "react";
import { IntroScreen } from "./components/IntroScreen";
import { CaptureScreen } from "./components/CaptureScreen";
import { ViewerScreen } from "./components/ViewerScreen";
import type { Frame, Mode, Screen } from "./types";

function App() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [unitName, setUnitName] = useState("");
  const [mode, setMode] = useState<Mode>("exterior");
  const [targetCount, setTargetCount] = useState(24);
  const [frames, setFrames] = useState<Frame[]>([]);

  function startCapture() {
    setFrames([]);
    setScreen("capture");
  }

  function handleCapture(
    src: string,
    tilt: { beta: number; gamma: number } | null,
    heading: number | null,
  ) {
    setFrames((prev) => [...prev, { src, tilt, heading }]);
  }

  function handleUndo() {
    setFrames((prev) => prev.slice(0, -1));
  }

  function handleCloseCapture() {
    if (frames.length && !confirm("Discard captured frames and go back?")) {
      return;
    }
    setScreen("intro");
  }

  function handleDoneCapture() {
    if (frames.length < 2) return;
    setScreen("viewer");
  }

  function handleRestart() {
    if (!confirm("Clear this spin and start a new capture?")) return;
    setFrames([]);
    setScreen("intro");
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      {screen === "intro" && (
        <IntroScreen
          unitName={unitName}
          onUnitNameChange={setUnitName}
          mode={mode}
          onModeChange={setMode}
          targetCount={targetCount}
          onTargetCountChange={setTargetCount}
          onStart={startCapture}
        />
      )}
      {screen === "capture" && (
        <CaptureScreen
          mode={mode}
          frames={frames}
          targetCount={targetCount}
          onCapture={handleCapture}
          onUndo={handleUndo}
          onClose={handleCloseCapture}
          onDone={handleDoneCapture}
        />
      )}
      {screen === "viewer" && (
        <ViewerScreen
          mode={mode}
          unitName={unitName}
          frames={frames}
          onBackToCapture={startCapture}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

export default App;
