export const HandState = {
  // Normalized coordinates (0 to 1) 
  x: -999,
  y: -999,
  // Interaction flags
  isPinching: false,
  pinchPulsed: false, // Set to true when a fresh pinch occurs, consumed by Canvas
  // Camera dims to help unproject correctly
  camWidth: 1,
  camHeight: 1
};
