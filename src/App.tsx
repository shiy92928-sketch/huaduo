/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import CanvasScene from './CanvasScene';
import HandTracker from './HandTracker';

export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans text-white">
      {/* 3D Scene Background */}
      <CanvasScene />
      
      {/* UI Overlay and Camera Pipeline */}
      <HandTracker />
    </div>
  );
}
