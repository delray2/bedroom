
Comprehensive Analysis of Bedroom Codebase
Smart Home Dashboard Codebase Review

## Front-end build workflow (Vite)

The dashboard front-end is bundled with [Vite](https://vitejs.dev/). Source files live under `src/` and are composed as ES modules. Two entry points power the application:

- `src/pages/dashboard.js` – main kiosk UI loaded by `index.html`.
- `src/pages/settings.js` – Hubitat configuration UI loaded by `settings.html`.

Static assets that should be copied verbatim (icons, SVGs, manifest, service worker) reside in `public/`. Assets imported from JavaScript or CSS (for example the rollershade icon) live in `src/assets/` so Vite can fingerprint them.

Common scripts:

- `npm run dev` – start the Vite dev server for browser debugging.
- `npm run build:frontend` – generate production bundles in `dist/`.
- `npm start` – build the front-end and launch the Electron shell (kiosk mode).

Electron now loads `dist/index.html`, so the front-end must be built at least once before running the desktop shell.

main.js (Electron Main Process – Backend Server)
Core Functionality: This Node/Electron script launches the application’s main process and a local web server for device updates. It creates an Electron browser window (1920x1080, fullscreen kiosk mode) that loads index.html. Concurrently, it starts an Express server (listening on port 4711) and a WebSocket server (on port 4712) to facilitate communication between Hubitat (the smart home hub) and the front-end UI. Key Responsibilities:
WebSocket Broadcast: Sets up a WebSocket server to broadcast JSON messages to all connected clients (the front-end UI). It provides a helper broadcast(data) function to JSON-encode and send messages to every WebSocket client.
REST API Endpoints: Defines several Express routes that Hubitat or other services call to report events or request actions:
POST /api/hubitat/webhook – Device State Webhook: Hubitat sends device state changes here. The code normalizes the incoming data (handles new vs legacy format) and identifies the device ID, attribute name, and value. It then broadcasts a message of type "device_state_update" with the updated attributes for that device. This keeps the UI in sync with real-time device states.
POST /api/notify – Generic Notifications: A catch-all for various notifications. If the payload contains a deviceId, it broadcasts a "device_notification" (used for device-specific alerts). If content.type is "lrgroup_update", it broadcasts an "lrgroup_update" message (in this app, device 453 is a special Living Room group). Otherwise, it sends a generic "general_notification". (These messages could trigger on-screen notifications or special handling in the UI.)
POST /api/refresh-device/:id – Single Device Refresh: Triggers the front-end to fetch fresh state for a specific device. It broadcasts a "device_refresh_request" with the target deviceId.
POST /api/refresh-devices – Bulk Refresh: Similar to above, but accepts an array of deviceIds in the request body. It broadcasts a "bulk_device_refresh_request" for multiple devices at once (e.g. refresh all devices in a group).
GET /api/health – Health Check: Returns a JSON status (e.g. {"status":"healthy", "timestamp":..., "websocketClients": <count>}) to confirm the server is running.
Camera Trigger: A middleware checks every incoming request for the keyword “reolink” (a camera brand). If found (e.g. a camera’s webhook), it broadcasts a "reolink_webhook" event. This is used to auto-open the camera feed on the dashboard when motion is detected.
Electron Window Setup: Creates a BrowserWindow and immediately opens index.html in it. The window is configured for a kiosk touchscreen display – no menu bar, always on top, skipping the taskbar, and prevents exiting via the Escape key.
File Interactions: The backend communicates with the front-end entirely via WebSockets and HTTP calls. It doesn’t directly import front-end files, but the messages it broadcasts (e.g. "device_state_update", "device_refresh_request", "reolink_webhook") are handled by the UI scripts. The ACCESS_TOKEN and MAKER_API_BASE (Hubitat Maker API URL) are not defined here – they reside in front-end config (so the server is decoupled from direct Hubitat calls, except for relaying webhooks).
index.html (Front-End HTML Structure)
Core Functionality: Serves as the UI layout for the smart home dashboard – a full-screen, touch-friendly control panel. It contains the static HTML elements for the dashboard interface and includes all front-end scripts and styles. Key UI Elements:
Background Design: Several <div class="blob…"> elements create floating blob shapes as a decorative background.
Lock Indicator: <div id="lockIndicator" class="lock-indicator">🔓</div> – Displays a lock emoji indicating the front door lock status (🔓 unlocked or 🔒 locked). It has ARIA attributes for accessibility and will be updated dynamically by script when the lock toggles.
Clock Display: A <div class="clock"> containing <div id="currentDate"> and <div id="currentTime"> shows the current date and time. The script continuously updates these elements every second.
Wall Switch Panel: A stylized “switch plate” UI (<div class="switch-card">) with two large paddle switches:
Left Paddle (“Lights”): Controls the Bedroom Lights group (all lights in the room). Initially it has class "off" (grayed out). Tapping it will toggle the group on/off via the Hubitat Maker API.
Right Paddle (“All”): Intended to control All Lights (or an “All” group). It’s similarly styled as a paddle switch with class "off". This likely toggles all house lights on/off (the exact device group ID for “All” is configured in the scripts).
Labels: Above the paddles, labels “Lights” and “All” identify each switch.
Side Buttons Toolbar: A vertical column of round icon buttons on the right side (<div id="sideBtns" class="side-btns">). Each button uses an emoji icon and has a data-action attribute that triggers a specific modal or action:
TV (📺) – data-action="showTvModal": Opens TV controls (e.g. remote control for Fire TV/Roku).
Lights (💡) – data-action="showBubbleChartModal": Opens the Lighting modal, which provides fine control of lights (dimming, colors) and scene selection via a “bubble chart” interface.
Rollershade (🪟) – data-action="showRollershadeModal": Controls motorized blinds (open/close).
Lock (🔒) – data-action="toggleLock": Toggles the front door lock. This is a direct action (no modal needed); the lockIndicator will update accordingly.
Camera (📷) – data-action="showCameraModal": Opens a live camera feed modal (security camera).
Thermostat (🌡️) – data-action="showThermostatModal": Would open thermostat controls (temperature settings).
Music (🎵) – data-action="showMusicModal": Would open music/media controls.
Theme Toggle (🌙/☀️) – <button id="themeToggle">🌙</button>: Toggles between dark and light UI themes (icon switches between moon and sun).
All side buttons are initially shown, but the interface includes logic to hide them after 10 seconds of inactivity (for a cleaner look) and reveal on user interaction.
Modal Containers: Two overlay sections at the bottom of the HTML for pop-up content:
General Modal (#modalBg and #modalContent): A reusable centered modal window. It contains a “Back” button (#backModal, hidden by default) for navigating back within multi-step modals, a “Close” (#closeModal) × button to exit, and an empty content area (<div id="modalBody">) where dynamic HTML will be injected.
Camera Modal (#cameraModalBg and #cameraModal): A separate full-screen overlay dedicated to the camera feed. This has its own close button (#closeCameraModal). It’s separate so the camera stream can be handled distinctly (e.g. different styling or timeouts).
Script Includes: The HTML includes all the front-end scripts in a logical order:
HLS.js library (via CDN) – for streaming video (used if WebRTC fails).
video-stream.js – sets up video streaming (WebRTC/HLS/MJPEG for the camera).
styles/main.css – the stylesheet for the UI.
Front-end JS files: loaded at the end of body:
state-manager.js (manages centralized device state)
main.js (front-end main script with data and event setup)
modal.js (modal window behaviors)
ui.js (UI helpers: inactivity timer, emoji fixes, WebSocket client, toast notifications)
api.js (as a module; provides API calls to Hubitat Maker API)
ui-manager.js (overall UI controller that ties UI events with state updates and modal actions)
devices.js (logic for device-specific modals and controls)
controls.js (handlers for TV, rollershade, lock, etc., and exposing certain functions globally)
camera.js (camera modal logic)
scenes.js (as a module; scene definitions and lighting “bubble chart” UI)
The scripts (except the two marked as modules) execute in the global window context so they can define global variables and functions used across files.
File Interactions: index.html is central to how all scripts and components come together – it provides the elements that scripts will query (getElementById, etc.) to attach event listeners or update content. For example, the side buttons and modals defined here are manipulated by ui-manager.js and modal.js. The structure in index.html also reflects data flows: e.g., the id="currentTime" element is updated by a function in scripts/main.js, the id="lockIndicator" text is updated by controls.js when the lock toggles, etc.

## Configuring the Hubitat Maker API

The dashboard no longer hard-codes the Maker API base URL, access token, or key device IDs. Instead, use the built-in settings page—which now includes Hubitat device discovery—to capture everything without touching source files.

1. Launch the dashboard and click the new ⚙️ Settings button (or open `settings.html` directly).
2. Enter your **Maker API Base URL** (e.g. `http://YOUR_HUB_IP/apps/api/<appId>`) and **Maker API Access Token**.
3. Click **Discover devices** to call `/devices` on the Maker API. The results are cached locally and power the dropdowns next to each required field.
4. Use the dropdown menus (or type manually) to assign the **Bedroom Lights Group** and **Bedroom Fan 2** device IDs. Suggestions come from the discovery list so you don’t have to guess IDs.
5. Optionally paste a custom JSON device map to override the default dashboard bindings.
6. Press **Save changes**. The configuration—along with the cached discovery list—is stored under the `hubitatDashboardConfig` key in `localStorage`. Reload the dashboard so every script picks up the new values.

Use **Copy current config** to export the saved JSON, or **Reset to defaults** to restore the baked-in sample values and clear the cached discovery list.

video-stream.js (Video Stream Handler)
Core Functionality: This script implements a VideoStream class to handle live camera streaming, preferring WebRTC and falling back to HLS or MJPEG streams. It’s included early (before other app scripts) so that the camera modal logic can utilize it. Key Features:
Maintains a peerConnection for WebRTC and tracks the created video element (this.videoElement) and media stream.
WebRTC via go2rtc: The class connects to a local go2rtc server (this.go2rtcUrl) to retrieve a camera feed named “reolink.” On initializeStream(streamName), it:
Creates a new RTCPeerConnection and generates an SDP offer for video.
Sends the offer to http://192.168.4.145:1984/api/webrtc?src=reolink (the go2rtc API) and awaits an answer SDP.
Sets the answer as the remote description, establishing a WebRTC connection to the camera stream.
Obtains the remote video track and attaches it to a newly created HTML <video> element.
HLS Fallback: If WebRTC is unsupported or fails, it checks Hls.isSupported() (HLS.js library). The class provides createHLSStream(streamName) which:
Creates a <video> element and an Hls.js player instance.
Loads the HLS playlist from http://192.168.4.145:1984/{streamName}.m3u8 (the go2rtc server’s HLS endpoint) and attaches it to the video.
MJPEG Fallback: If HLS also fails (e.g., in older browsers or if the server doesn’t provide HLS), it falls back to createMJPEGStream(streamName). This likely creates an <img> or <iframe> element that points to an MJPEG stream URL (e.g., …/streamName.mjpeg). This provides a basic live feed by continuously streaming JPEG images.
Stop Stream: The class includes a stop() method to close any active stream:
If WebRTC was used, it closes the peerConnection and stops tracks.
If an HLS player exists, it is destroyed.
If an MJPEG image is being used, it can simply be removed.
This prevents multiple connections or memory leaks if the camera modal is opened/closed repeatedly.
How It Contributes: video-stream.js is utilized by camera.js to actually fetch and display the camera feed. It encapsulates the complexity of streaming protocols so the rest of the app can just call VideoStream.initializeStream() and get back a video element or throw an error. By including both WebRTC and HLS, it ensures the camera feed works with low latency (WebRTC) when possible, but still works in the Electron environment or fallback scenarios (via HLS/MJPEG).
scripts/state-manager.js (Device State Manager)
Core Functionality: Provides a centralized state store for all device statuses and a publish/subscribe mechanism for state changes. It ensures all parts of the UI reflect the latest device states and helps throttle rapid updates to avoid flicker. Key Components:
DeviceStateManager Class: A class that holds:
this.devices – a Map of device ID → current state attributes.
this.listeners – a Set of callback functions subscribed to state changes.
this.updateQueue – a Map used to debounce rapid successive updates for the same device.
this.debounceDelay – set to 100ms; slight delay to batch updates.
State Updates: The method updateDevice(deviceId, attributes) is the primary way to update a device’s state in the store. It:
Converts deviceId to string (IDs are kept as strings for consistency).
Checks if the new attributes differ from the last known state using hasStateChanged(). Only significant fields (like switch, level, hue, saturation, colorTemperature, lock, contact, temperature) are compared to decide if the change is meaningful for the UI.
Stores the new state (with a lastUpdated timestamp).
Invokes debounceUpdate(deviceId) to notify listeners after a short delay, replacing any prior pending notification for that device (so if multiple updates arrive quickly, only the latest state is applied after 100ms).
Listeners & Notification: Components can subscribe via deviceStateManager.subscribe(listenerFn). The manager will call all subscribed listeners with (deviceId, attributes) whenever a device’s state changes (after debouncing). It returns an unsubscribe function for cleanup.
Batch Updates: updateMultipleDevices(deviceUpdates) simply iterates through an object of {id: attributes} pairs and calls updateDevice for each. This can be used if a bulk of state info is received at once.
Retrieving State: Methods getDevice(deviceId) and getAllDevices() allow querying the stored state. getDeviceSummary(deviceId) formats a subset of attributes (like on/off as boolean, numeric level/hue, etc.) for convenient use in UI.
Online Status: isDeviceOnline(deviceId, maxAgeMs) returns true if the device has reported in within the last maxAgeMs (default 5 minutes) – used to gray out or indicate offline devices.
Hubitat Integration:
refreshDevice(deviceId) triggers an immediate fetch to Hubitat’s Maker API for the device’s latest status. It calls Hubitat at GET /devices/{deviceId} using the global MAKER_API_BASE and ACCESS_TOKEN (which are attached to window by api.js or main.js). On a successful response, it normalizes the returned device.attributes (Hubitat may return an array of attribute objects) into a simple {name: value} map via normalizeAttributes(), then calls updateDevice with that data. This is used for on-demand updates (e.g. when opening a device modal or after sending a command, if no webhook is expected).
The manager does not auto-poll; it relies on Hubitat’s push (webhook) updates and manual refresh calls. This prevents redundant network calls.
Global Instance: At the bottom, it instantiates a single DeviceStateManager and attaches it to the global window as window.deviceStateManager. This singleton is used throughout the UI scripts to update or read device states.
File Interactions: Being a global state container, this manager is used by multiple other scripts:
api.js uses it to update state after fetching device status (to integrate the fresh data into the app state).
devices.js and ui-manager.js subscribe to the state manager to react to changes. For example, UIManager subscribes so it can update UI elements whenever state changes occur (like changing button highlights, updating text) in its handleDeviceStateChange method.
ui.js calls deviceStateManager.updateDevice or updateMultipleDevices when WebSocket messages arrive (applying the new state data broadcast from the backend).
Essentially, state-manager.js is the bridge between incoming data (from Hubitat via webhook/WS or via API fetch) and the visual UI components.
scripts/main.js (Front-End Main Script)
Core Functionality: This is the main initialization script for the front-end. It sets up configuration constants (like device IDs and API tokens), defines the list of devices and their capabilities, and initializes recurring tasks (like the live clock). In essence, it is the brain that glues together device data with UI logic. Key Elements:
Hubitat API Config: Defines MAKER_API_BASE and ACCESS_TOKEN for the Hubitat Maker API (using local IP and an app token). These are used by other scripts to form HTTP requests to control or query devices.
Device ID Constants: For convenience, it sets constants for important device IDs:
BEDROOM_GROUP_ID – e.g. '457' for the “Bedroom Lights Group” device (a Hubitat group that controls all bedroom lights at once).
BEDROOM_FAN2_ID – e.g. '451' for a specific device (like a smart bulb named Bedroom Fan 2).
(There may be others for specific devices or groups if needed.)
Device Metadata: Defines a comprehensive list of devices in this dashboard’s scope. For example, bedroomDevices is an object mapping device IDs (as strings) to their details (label, capabilities, attribute names, command names). This appears to be a curated subset of the full device list (possibly pulled from devicesfulldetails.json). Devices included might be:
Lights (e.g. Bed Lamp 447, Laundry Light 450, Fan Light bulbs 480 and 451, etc.) – all with capabilities like Switch, Level, Color, etc.
Possibly other devices like a Lifx Beam, a Table Lamp, etc., as indicated by entries like '452': {label: 'Table', ...}.
Special group devices or virtual devices (e.g. the Bedroom group itself, and perhaps other grouped or scene-related devices).
Device Map: It creates a DEVICE_MAP object summarizing which devices tie into which UI controls. Each entry maps a device ID to:
label (human-friendly name),
type (e.g. 'group' for aggregated controls like the main light group, or 'light' for individual bulbs, etc.),
controls – an array of keywords indicating how this device is used in the UI. For example:
The Bedroom Lights group (BEDROOM_GROUP_ID) has controls: ['paddleSwitch', 'globalControls'], meaning it is linked to the on-screen paddle switch and to “global controls” (the lighting modal interface for all lights).
Individual lights have controls: ['deviceModal', 'scenes'], meaning they appear in the lighting scenes/bubble chart and have a dedicated device modal for detailed control.
Other devices might have specific tags (for instance, a “Fireplace Power Switch” or others could be linked to different UI parts).
State Update Handling: Defines a global function handleDeviceStateUpdate(deviceId, attributes) that the UI WebSocket handler can call for centralized processing of incoming state changes. This function:
Throttles updates by ignoring events that occur too rapidly (using a timestamp and a RATE_LIMIT_INTERVAL) to avoid spamming the UI with flickers.
Calls deviceStateManager.updateDevice(deviceId, attributes) to update the central state store.
Then checks the DEVICE_MAP for that device to update specific UI elements:
For example, if a device corresponds to the main light group (paddle switch control), it triggers updatePaddleSwitchUI(...) to reflect the new on/off state on the big wall switch buttons.
If a device is the door lock or other special items, it might directly update icons or text.
Essentially, it performs any immediate UI updates that are not covered by the generic subscription mechanism (to ensure critical indicators like the wall switch or lock icon update without delay).
Wall Switch Control: Provides logic to handle the two large paddle switches on the UI:
An updateClock() function updates #currentDate and #currentTime every second to show a live clock.
Functions to control the wall paddles. For instance, toggleAllLights() or similar might be defined (the code sets up event listeners on the paddle elements to call the Maker API for the group device). In the device map, the Bedroom group’s association with 'paddleSwitch' signals that toggling the UI switch should send a command to BEDROOM_GROUP_ID. Indeed, BEDROOM_GROUP_COMMAND_URL(cmd) is defined to easily form the Maker API URL for turning the group on/off. When a paddle is pressed:
If it’s the “Lights” paddle, it likely calls something like fetch(BEDROOM_GROUP_COMMAND_URL('on' or 'off')) to turn all bedroom lights on/off, then maybe shows a quick feedback (or just relies on the subsequent state webhook to update the UI).
The “All” paddle might similarly target another group (possibly an “All Lights” group if configured) – though in code we didn’t explicitly see an ALL_GROUP_ID, it might be hard-coded or left for future use.
updatePaddleSwitchUI(allOn) is used to visually update the switch status (adding/removing the "off" class on the HTML elements). For example, if all bedroom lights are now on, it will remove the "off" class on the corresponding paddle element, giving it a “on” appearance (bright colored), otherwise add "off" to dim it.
Initial API Calls: On startup, this script triggers a call to the backend’s notify endpoint. Inside a DOMContentLoaded event, it does:
fetch('http://localhost:4711/api/notify', { method: 'POST', body: {...} });
This likely notifies the backend that the dashboard UI is up (perhaps logging presence or requesting initial data). It could send a payload like {content: "dashboard_loaded"} (though the exact content isn’t shown in snippet, the code clearly attempts a POST to /api/notify on load).
Global Exposure: It assigns some variables/functions to window if needed. For example, livingRoomDevices (used in other scripts) is set equal to bedroomDevices here, to reuse generic device-handling code originally written for “livingRoom”. It also might attach handleDeviceStateUpdate to window (so that ui.js can prefer the central handler) and possibly other helper functions.
Dependencies & Interactions: This front-end main script runs early, so it sets up global constants (MAKER_API_BASE, etc.) that api.js and other scripts will use. It defines DEVICE_MAP and device lists that devices.js references (e.g., devices.js uses livingRoomDevices to know device capabilities when building modals). It also contains the main logic for wall switch and state handling that ties into ui.js (which calls window.handleDeviceStateUpdate if present). In summary, scripts/main.js prepares configuration and data that the rest of the UI scripts rely on, and implements high-level responses to device events (ensuring the dashboard’s primary controls like the big switches and lock reflect the correct state).
scripts/modal.js (Modal Window Management)
Core Functionality: Handles the display and animation of the pop-up modals (the overlay windows) in the UI. This file provides functions to show/hide the modal overlay with smooth transitions and manages the modal navigation (back vs close). Key Functions:
showModalContent(html, showBack=false, triggerSelector=null): The primary way to open content in the main modal. It injects the provided html string into the #modalBody container, controls whether the “Back” button is visible (showBack flag), and then calls showModalBg(triggerSelector) to animate the modal onto the screen.
showModalBg(triggerSelector): Reveals the modal background overlay (#modalBg) and #modalContent with a zoom/fade animation:
It makes the background <div id="modalBg"> visible (display = 'flex').
If a triggerSelector is provided (e.g. a button that triggered the modal), it finds that element’s screen position (getBoundingClientRect()). This is used to start the modal animation from that point – the modal content initially scales at 0.7 and is translated from the trigger’s center towards the center of the screen.
Then it quickly (10ms timeout) adds a .visible class to modalBg and resets #modalContent transform to normal scale/position, which via CSS transition causes the modal to grow from the trigger into the center and fade in.
hideModalBg(): Closes the modal with a reverse animation:
Calculates the end translation back to the original trigger’s position (using the saved modalTriggerRect).
Scales #modalContent down and moves it to that position, and fades out (by removing the .visible class on the background).
After a short delay (~350ms, matching CSS transition), it fully hides #modalBg (display = 'none') to remove the modal from view.
Back vs Close: The Back button (#backModal) is meant for navigating back within a modal flow (e.g., from a sub-modal back to a main modal screen), whereas the Close (#closeModal) exits the modal entirely. showModalContent will show or hide the Back button based on context. For example, when first opening a modal from a side button, showBack might be false (no back arrow, just close), but if that modal then opens a sub-view, it can call showModalContent(..., showBack=true) to enable the Back button.
Active Modal Tracking: The script keeps a global activeModal variable to track what content is currently open (e.g., 'main' for primary modals, 'camera' for the camera modal, etc.) and a modalTimeout for auto-closing. Specifically:
startModalTimeout() sets a 30-second timer (MODAL_TIMEOUT = 30000) to auto-close the modal if no interaction. This calls closeActiveModal() when time elapses.
closeActiveModal() checks if activeModal === 'camera' – if so, calls hideCameraModal() (to properly shut down the camera stream); if activeModal === 'main' (any normal modal), it calls closeModal() to hide it. Then it clears state.
These ensure that if a user leaves a modal open, it will close itself after 30 seconds (good for screensaver behavior).
Event Listeners: On DOMContentLoaded, modal.js attaches handlers:
The Close “×” button (#closeModal) is bound to call closeModal() (which simply calls hideModalBg() and resets state).
The modal background (#modalBg) itself is given an on-click handler that closes the modal if the user clicks outside the content (i.e., if the background itself is clicked, treat it as cancel/close). This is done by checking if (e.target.id === 'modalBg') then calling closeModal().
The Back button (#backModal) click handler is set to navigate to a previous modal view. In this implementation, it calls window.uiManager.showBubbleChartModal() if available. (This suggests that the back arrow is primarily used to return to the “Lights bubble chart” modal from a deeper view, like from an individual device control back to the main lighting controls. For other modal flows, the logic could be extended accordingly.)
Compatibility: Also defines window.showModal = function(html, showBack=false) { showModalContent(html, showBack); } for backward compatibility or convenience. This ensures older code or other modules can open modals via a common interface.
How It Contributes: modal.js provides a smooth user experience for modal dialogs: it handles the fancy animations (zoom-in/out from the button pressed) and ensures modals don’t linger forever. It doesn’t decide what content to show – other scripts call showModalContent(...) with the desired HTML. For example, controls.js uses showModalContent to display the TV remote UI, and devices.js uses it to show device control panels. This file also coordinates with ui-manager.js for the Back button functionality (delegating the actual content switch to UIManager). By centralizing modal behavior here, the rest of the app can open/close modals with one function call and not worry about animations or cleanup.
scripts/ui.js (General UI Utilities and WebSocket Client)
Core Functionality: This script handles various UI-level interactions and utilities: managing the side button visibility on inactivity, replacing emoji icons with SVGs for consistency, initializing the WebSocket connection to the backend, and showing toast notifications. It acts as a supportive script to enhance the user interface responsiveness and platform fidelity (especially within Electron). Key Features:
Inactivity Timer for Side Buttons:
Defines an inactivity timeout (10 seconds) and functions showSideBtns() and hideSideBtns() to add or remove the 'side-btns-visible' class on the side button container. Initially, the side button panel is visible, but after a period of no user input it will auto-hide.
The script sets up a list of user activity events (mousemove, mousedown, touchstart, keydown) that should reset a timer.
On first user interaction, onFirstActivity() is called: it makes sure the side buttons are shown (in case they were hidden) and starts the inactivity listeners. It also removes itself so that subsequent interactions just reset the timer, rather than re-initializing everything.
This means when the dashboard is idle (no touches) for 10 seconds, the side buttons will fade out. As soon as the user touches the screen or moves the pointer, the buttons reappear and remain on-screen while the user is interacting.
Emoji to SVG Replacement: Because some emoji might not render well or uniformly in the Electron environment, ui.js includes a mapping of certain emoji characters to custom SVG files (located in assets/emoji/). It creates a Map emojiToSvg mapping characters like '📺' -> '1f4fa', '💡' -> '1f4a1', '🔒' -> '1f512', etc., covering all icons used in the UI (TV, light bulb, window, lock/unlock, camera, thermostat, music note, moon, sun, brightness symbols, etc.).
On DOMContentLoaded, it runs through the document and for each element, it checks if its text content exactly matches one of these emoji. If so, it replaces it by applying a background-image style using the corresponding SVG file and adding classes (emoji-replaced and emoji-bg) to style it. The text is effectively replaced by the SVG icon, ensuring a consistent look.
Note: The theme toggle button (🌙/☀️) is handled specially – the comment suggests it’s replaced dynamically later once the theme is set, so it might be skipped initially to allow switching the icon on toggle.
WebSocket Client: Establishes a WebSocket connection to the backend at ws://localhost:4712 (matching the server in main.js). It sets up:
ws.onopen: logs connection success, and resets any reconnection attempt counter.
ws.onmessage: handles incoming messages from the server. Each message is expected to be JSON. Before parsing:
It checks for the string "reolink" in the raw data; if found, it immediately calls showCameraModal() to pop up the camera feed (this covers the case where a Reolink camera motion webhook triggers an event; the UI responds by showing the live camera modal).
Then it parses the JSON into an object and passes it to handleWebSocketMessage(msg).
handleWebSocketMessage(msg): a function that routes events by type:
"device_state_update" – calls handleDeviceStateUpdate(deviceId, attributes, timestamp), which in turn updates the deviceStateManager (and may use either the central handler from scripts/main.js if available or update directly).
"device_notification" – calls handleDeviceNotification(payload) (could display a toast or indicator for a device-specific alert).
"lrgroup_update" – calls handleLRGroupUpdate(payload) (custom handling for the Living Room group updates if needed, perhaps similar to device updates).
"device_refresh_request" – calls handleDeviceRefreshRequest(deviceId) which likely triggers deviceStateManager.refreshDevice(deviceId) to fetch fresh data because something requested it (for example, the user hit a refresh button, or a schedule triggered it).
"bulk_device_refresh_request" – calls handleBulkDeviceRefreshRequest(deviceIds[]) to refresh multiple devices (likely looping through and calling refresh on each).
"reolink_webhook" – is effectively handled earlier (by auto-showing the camera modal), so here it’s just noted and not processed further.
Unknown types are logged for debugging.
These handlers integrate with other parts of the app. For instance, handleDeviceStateUpdate uses window.deviceStateManager.updateDevice(...) and the UI Manager will pick up that change via its subscription to update visuals.
Toast Notifications (Transient Messages): Provides a global showToast(message, type='success', duration=3000) function to show brief overlay messages. For example, after a lock command or an error, showToast can display “Door unlocking…” or “Failed to toggle lock” feedback.
It ensures any existing toast is removed, then creates a new <div class="toast success">Message</div> (or with class "error" for error type, etc.) and appends it to the document body.
It then triggers a CSS animation by adding a "show" class slightly after insertion (using a short timeout). The CSS would handle the fade/slide-in effect.
After duration milliseconds, it removes the "show" class and then removes the toast element entirely after another short delay, causing a fade-out and cleanup.
At the end, it sets window.showToast = showToast to make it accessible globally. Other scripts use this to give user feedback (e.g., controls.js calls showToast("Door unlocking...", "success") when a lock command is sent).
Global Exposure: Besides showToast, it also attaches any needed references globally (for instance, after establishing the WebSocket, there might be logic to handle reconnections using a wsReconnectAttempts counter, though not detailed here). It ensures deviceStateManager (from state-manager) is available on window, but that is done in state-manager.js itself.
How It Interacts: ui.js is a utility script leveraged by many others:
ui-manager.js doesn’t have to implement its own WebSocket handling or inactivity logic – ui.js covers that and will call into UIManager (e.g. via window.handleDeviceStateUpdate or triggering deviceStateManager updates which UIManager listens to).
controls.js and others call showToast from here to display messages.
The emoji replacement ensures that the icons in HTML (which are placed in index.html or injected as text via other scripts) are visually consistent – for example, the lock icon 🔒 in the lockIndicator or the arrow icons ⬆️⬇️ in the rollershade buttons are replaced with their SVG counterparts for sharper rendering.
The inactivity timer works with the CSS in styles/main.css which likely defines .side-btns-visible to slide the toolbar in and out.
The WebSocket message handling ultimately triggers state changes and UI updates, linking the backend events (from main.js) to front-end reactions (state manager + UIManager).
scripts/ui-manager.js (UI Manager Controller)
Core Functionality: Encapsulates higher-level UI logic, tying together state updates and user interactions. UIManager is a class that on initialization sets up global event listeners (for side button clicks and theme toggling) and subscribes to device state changes to update the interface. It acts as the orchestrator responding to user inputs (like button presses) by calling the appropriate functions, and responding to state changes by updating or opening UI components. Key responsibilities:
Initialization: When a new UIManager is created, its constructor calls:
initializeEventListeners() – to set up click handlers for UI elements.
initializeStateManager() – to subscribe to the central DeviceStateManager (if available) for real-time device updates.
Side Button Click Handling: In initializeEventListeners(), a global click listener on document catches any click on an element with class side-btn. It reads the button’s data-action attribute and calls handleSideButtonClick(action) accordingly. This single handler covers all side toolbar buttons.
handleSideButtonClick(action): Uses a switch or mapping to perform the appropriate UI action:
For actions that correspond to showing modals (e.g. "showTvModal", "showRollershadeModal", "showCameraModal", "showThermostatModal", "showMusicModal"), UIManager will invoke the global function if it exists. For example, if showTvModal is defined (in controls.js), it calls it; otherwise, it might call this.showModal(...) to display a “coming soon” message. This ensures the app doesn’t break if some modals are not yet implemented – it will gracefully inform the user.
For "showBubbleChartModal" (Lights), it calls this.showBubbleChartModal() – a method presumably implemented within UIManager to open the lighting control modal (likely delegating to functions in scenes.js).
For "toggleLock", it checks if window.toggleLock exists (which is defined in controls.js) and calls it to toggle the door lock.
In summary, UIManager funnels the button actions to the right function. It knows which ones are handled internally vs. globally and provides fallback messaging for unimplemented features.
Theme Toggle: Still in initializeEventListeners(), it finds the theme toggle button by id="themeToggle" and sets an onclick to call this.toggleTheme(). This connects the UI button to the logic for switching themes:
toggleTheme(): Toggles between dark and light themes by adding/removing a CSS class on the <body> element. Specifically, if the body currently has class "dark-theme", it will remove it (switching to light mode) and change the theme toggle’s icon text to moon (🌙). If not, it adds "dark-theme" and changes the toggle icon to sun (☀️). It also saves the user’s preference to localStorage ('theme': 'dark' or 'light') so the choice persists.
On initialization, UIManager reads any saved theme from localStorage on DOMContentLoaded and applies it – if 'dark', it pre-sets the body class and toggle icon appropriately. This way, the dashboard loads in the last chosen theme.
Device State Subscription: initializeStateManager() runs if window.deviceStateManager is present. It calls deviceStateManager.subscribe(...) and provides a bound callback to this.handleDeviceStateChange. This means any device state change (from Hubitat events or refreshes) will invoke UIManager’s handler.
handleDeviceStateChange(deviceId, attributes): When the central state is updated, this method is called with the device data. It logs the update and then invokes two update methods:
this.updateDeviceDisplay(deviceId, attributes) – updates any open device modal UI if the changed device is currently being viewed.
this.updateGlobalControls(deviceId, attributes) – updates the main lighting controls UI if the changed device is the global Bedroom Lights group (the code checks if (deviceId === BEDROOM_GROUP_ID) and if the global controls modal is open).
updateDeviceDisplay: Checks if a device detail modal is open by looking for an element #deviceControls in the modal content. If found and visible, it calls getCurrentModalDeviceId() (likely to retrieve which device’s controls are being shown) and if it matches the incoming deviceId, it calls this.refreshDeviceControls(deviceId). That presumably re-renders the controls (buttons, sliders, etc.) in the modal with the new state (for example, updating a level slider position if the light level changed, or toggling a switch button).
updateGlobalControls: If the Bedroom Lights group state changes and the “bubble chart” lighting modal is currently open (.global-ring-top element is visible), it calls window.renderGlobalControls({attributes}). This is a function defined in scenes.js that updates the group control UI (like a central brightness dial) to reflect the new attributes. For instance, if lights were turned on/off elsewhere, the brightness ring or on/off indicator in the modal updates in real-time.
showBubbleChartModal: UIManager likely implements a method to open the main Lights modal (bubble chart). Although the code for it wasn’t explicitly shown in snippets, we see references where backModal (back arrow) triggers uiManager.showBubbleChartModal(). So UIManager coordinates with scenes.js to display the lighting UI:
It probably calls some function exported by scenes.js to render the content, then uses showModalContent to display it. In fact, UIManager might have a simple this.showBubbleChartModal() that just does window.showBubbleChartModal() if defined or directly calls scenes.js logic. However, since scenes.js is a module, likely UIManager itself contains the call to compose the modal.
In any case, when the user presses the Lights button, UIManager.handleSideButtonClick('showBubbleChartModal') leads to UIManager.showBubbleChartModal(), which opens the Lighting control modal. That modal typically shows a circular arrangement of lights and possibly scene presets (as described in scenes.js below).
Global Access: After instantiating UIManager (usually right after defining the class), the script attaches it to window.uiManager. It also runs the theme initialization on DOMContentLoaded to apply the saved theme before user interaction.
How It Works with Others: UIManager is a central coordinator:
It relies on controls.js for the actual implementations of many modals. It doesn’t itself create the HTML for TV or thermostats – it just calls showTvModal() etc., which are defined in controls.js (and that file attaches them to window).
It works with scenes.js for the lighting modal content. UIManager triggers showing it and updates it via renderGlobalControls when state changes.
It depends on deviceStateManager (from state-manager.js) to get notified of device changes, rather than polling UI elements directly. In turn, it updates UI pieces or calls functions from devices.js (like renderDeviceControls) to refresh content.
The theme toggling interacts with the CSS in styles/main.css – specifically classes like .dark-theme on the body likely change background and text colors.
By funneling all side button clicks through one place, it simplifies adding new actions. Any new data-action just needs an entry in the handleSideButtonClick logic to wire it up to a function in the app.
scripts/devices.js (Device Modal & Control Logic)
Core Functionality: Manages the dynamic content for individual device control modals. When a user selects a specific device (for example, tapping a light’s icon in the Lights modal), this script is responsible for fetching that device’s latest state and showing controls (on/off toggle, sliders for brightness, color pickers, etc.) tailored to its capabilities. Key Functions:
openDeviceModal(label, deviceId, showBack=false): The entry point to show a detailed control modal for a device.
If the deviceId is not recognized in the livingRoomDevices data (meaning the app doesn’t have metadata for it), it will show a simple modal saying “Controls for [Device] coming soon...” as a placeholder.
If the device is known, it immediately calls showModalContent() to display a modal with a header <h2>${label}</h2> and a content container <div id="deviceControls" …>Loading...</div>. The showBack parameter is passed through (likely true if coming from the Lights modal, so a back arrow will appear to return to the main lighting view) and it uses the Lights side button as the animation trigger (so the modal grows out of the “Lights” button position).
After displaying the loading state, it triggers an async load: it calls window.deviceStateManager.refreshDevice(deviceId). This will fetch the latest data from Hubitat. Once the promise resolves, it obtains the updated attributes from the state manager and calls renderDeviceControls({attributes: attrs, capabilities: ...}, deviceId). Essentially, it defers the heavy lifting to renderDeviceControls to populate the UI.
renderDeviceControls(device, deviceId, showBack=false): This function builds the actual HTML interface for controlling the given device. It uses the static info from livingRoomDevices[deviceId] (which actually points to the detailed object in bedroomDevices as mapped in main.js) to know what capabilities and commands this device supports.
For example, if the device has capability "Switch" and "Level", it will create an On/Off toggle button and a brightness slider. If it has color control, it might show a color wheel or color preset buttons. The code likely creates UI elements such as:
A section for basic controls: power toggle (on/off), dimmer (if SwitchLevel).
If color-capable: perhaps a hue/saturation or color temperature control.
If a sensor: maybe display sensor readings (but sensors probably wouldn’t be opened via openDeviceModal in this context).
It also likely includes a “refresh” icon or button to manually refresh the device (depending on UX design).
The HTML structure might use stylized arcs or circles (“with-arches” class suggests some arc-shaped sliders or indicators for level/color).
After assembling the HTML string for controls, it finds the #deviceControls element in the modal and replaces “Loading...” with the new controls, or it could directly use showModalContent again to update the modal. (From the code flow, it appears openDeviceModal already opened the modal; renderDeviceControls might directly manipulate the DOM of that open modal.)
Event Handlers for Device Controls: Within the generated controls, interactive elements (buttons, sliders) will need event listeners. Likely, devices.js attaches those as part of rendering:
e.g., an on/off toggle button might have an onclick="sendDeviceCommand(id, 'off')" in the HTML or the script might add button.addEventListener('click', ...).
The script might utilize the apiService (from api.js) or direct fetch calls to Maker API when controls are used. For instance, if a brightness slider is changed, it could call apiService.sendDeviceCommand(deviceId, 'setLevel', value). We see evidence of direct fetch usage in this file: const url = devices/${deviceId}/${command} pattern and doing a fetch(url).then(...).catch(...) with a toast on success or error.
Also, if a color control is used, it might call setColor or setHue/ setSaturation as needed.
Pending Commands Map: At the top, devices.js ensures a global window.devicePendingCommands = new Map() exists. This could be used to track commands sent to devices that haven’t completed yet (to prevent sending duplicate commands or to update UI optimistically). It’s declared but it’s unclear how extensively it’s used in code provided – likely if a user toggles a device rapidly, it might store a pending state to avoid flicker.
Utility and Global Exposure: If there are helper functions (like formatting, or building certain control UIs) they’d be defined here. At the end of the file, it might expose some functions globally:
Possibly window.openDeviceModal = openDeviceModal; window.renderDeviceControls = renderDeviceControls; so that other modules (like scenes.js) can call openDeviceModal when a user clicks a device icon in the bubble chart.
Indeed, scenes.js does call openDeviceModal(label, id, true) when a user selects a specific bulb from the lighting interface.
It might also expose a function to send generic commands if not using apiService – but since apiService is available on window, the device modal could also call window.apiService.sendDeviceCommand(...).
Interactions:
With scenes.js: Scenes (lighting modal) uses devices.js to show individual device details. E.g., clicking a bulb on the bubble chart calls openDeviceModal here. Conversely, when a device modal is closed via the Back button, UIManager calls showBubbleChartModal to return to scenes.
With state-manager: After issuing commands (turn on, dim, etc.), devices.js doesn’t manually refresh the UI – it expects the Hubitat webhook or the explicit refresh it triggered to update state. However, openDeviceModal did call deviceStateManager.refreshDevice on opening, so the controls were built with current info. Also, deviceStateManager.subscribe (through UIManager) will update the modal if any change comes in while it’s open (via UIManager.updateDeviceDisplay calling refreshDeviceControls).
With api.js: Could use apiService for sending commands and getting status, but in the code, it looks like devices.js at least sometimes performs fetch directly for command endpoints. It then shows a toast “Command sent successfully!” on promise resolve, or an error toast if failed. This is a simpler approach relying on Maker API calls directly.
User Experience: This script ensures that when you tap on a device (say a particular light), you get a tailored control panel for it. It fetches up-to-date data so you see the current brightness or on/off state, and you can manipulate it. It then uses the common modal and toast functions to integrate smoothly (modal animations from modal.js, notifications from ui.js).
scripts/controls.js (Special Device Controls – TV, Rollershade, Lock, etc.)
Core Functionality: Implements the UI and commands for various miscellaneous devices and functions (mostly those corresponding to the side buttons beyond lighting). This includes the TV remote control interfaces, rollershade open/close, door lock toggle, and other “modal” content that isn’t just a simple device. Key Sections:
TV Controls Modal:
function showTvModal(): Opens a modal that lets the user choose between controlling a Fire TV or a Roku TV (perhaps there are two TV devices integrated). It constructs HTML with two large buttons: “Fire TV” (🔥 icon) and “Roku TV” (📺 icon). Each button’s onclick is set to call showFireTvModal() or showRokuTvModal(), respectively.
It also includes an empty <div id='tvFeedback' class="toast"></div> within the modal HTML. This is likely a placeholder where feedback messages (like “Sent command”) can briefly appear. The toast system in ui.js will remove any .toast elements when showing a new message, including this feedback area (this strategy of including a toast div in the modal could be to position messages near the remote).
Finally, showTvModal() calls showModalContent(html, true, '.side-btn[title="TV"]'). This displays the TV selection modal, with the “Back” arrow enabled (showBack=true) and uses the TV side button as the trigger for animation (so the modal zooms out of the TV button).
Fire TV Remote Modal:
window.showFireTvModal = function() { … }: When the user chooses Fire TV, this function builds the actual remote control interface for the Fire TV device. It likely:
Adds a modal header “Fire TV Remote”,
Creates a grid of remote control buttons (structured with <div class="fire-tv-remote"> containing various <button class="remote-btn …"> elements).
The remote layout is divided into sections: e.g., a top row for Power, Home, Back; a navigation pad for Up/Down/Left/Right/Select; playback controls (Play/Pause, Rewind, Fast-forward); etc. Each button is represented by an icon (often SVG) and a label.
For instance, the Power button is defined with an inline SVG graphic (a power symbol) and label “Power” and triggers fireTvSendCommand("power") on click. The script defines similar buttons for home, back, arrows, etc., each calling fireTvSendCommand(...) with an appropriate command string (like "home", "back", "up", "down", "select", "playpause", etc.).
After building the remote control HTML, it likely calls showModalContent(html, true) (with showBack=true to allow going back to the TV selection modal). The triggerSelector might still be the original TV side button or possibly the container of the selection modal; however, it already is in a modal context, so it may just swap content.
Roku TV Remote Modal:
window.showRokuTvModal = function() { … }: Similarly constructs a “Roku TV Remote” interface. It would have its own set of command buttons (Roku commands might differ slightly, but conceptually similar: arrows, OK, home, back, etc.). Buttons call rokuTvSendCommand("<action>").
Also calls showModalContent(html, true) to display it with a back arrow (to go back to TV selection).
Sending TV Commands: The script defines functions to actually send the remote button presses:
window.fireTvSendCommand(cmd): likely sends a Maker API HTTP request or uses a specific API (maybe an HTTP endpoint on a Fire TV controller) for the given command. Since Fire TV may be integrated via a custom setup, this could call a Hubitat Maker API endpoint for a virtual device representing the Fire TV. Indeed, if the Fire TV device has an ID in Hubitat, fireTvSendCommand might do something like:
const url = `${MAKER_API_BASE}/devices/<FireTVDeviceID>/<cmd}?access_token=${ACCESS_TOKEN}`;
fetch(url).then(...).catch(...);
and possibly display a short toast in the tvFeedback area or using showToast.
Similarly, window.rokuTvSendCommand(cmd) would send commands to a Roku device (maybe via Maker API or a direct local network call).
The code snippet [104] shows multiple occurrences of showModalContent(html, true, '.side-btn[title="TV"]') – likely each time a new level of TV modal opens (selection → remote) they pass true and the original trigger. The duplication hints that after Fire TV or Roku modal usage, the back button will know how to step back.
Rollershade Controls:
function showRollershadeModal(): Opens a modal to control a window shade. The HTML has two large buttons: “Open” (⬆️ icon) and “Close” (⬇️ icon). These call rollershadeCommand("on") and rollershadeCommand("off") respectively, implying that sending an “on” command will open the shade and “off” will close it.
It probably uses showModalContent(html, true, '.side-btn[title="Rollershade"]') to display it, again with a back arrow (though this modal might not have a sub-modal, they still pass true which may be unnecessary).
window.rollershadeCommand(dir): likely sends a Maker API command to the shade device. If the shade is represented as a Switch in Hubitat, "on" could mean open (up) and "off" close (down). The code likely similar to the lock and uses fetch(MAKER_API_BASE/devices/<shadeID>/(on|off)) and then a toast confirmation.
Door Lock Toggle:
window.toggleLock = async function() { … }: This is defined to flip the lock state of a specific door lock device (e.g., front door lock). We saw its code:
It uses a hardcoded lockId = '509' (the Hubitat device ID for the lock).
Fetches the current state of the lock from Maker API (devices/509), then determines if it’s locked or unlocked.
Chooses the opposite command: if currently locked, nextCmd = "unlock", otherwise "lock".
Sends a Maker API call to /devices/509/<nextCmd>.
On success, displays a toast “Door locking…” or “Door unlocking…” (the code forms the message using nextCmd with “ing…”). On error, it toasts a failure message.
The lockIndicator UI in index.html (🔓 icon) will be updated when the Hubitat webhook sends the new lock state (which comes through the WebSocket and triggers deviceStateManager + UIManager subscription to update that element).
Miscellaneous:
It might also contain placeholders or partial implementations for Thermostat and Music:
Possibly showThermostatModal and showMusicModal just show a “coming soon” message (since we saw UIManager will call them if defined, otherwise UIManager itself will show a basic message).
If not implemented, UIManager’s fallback in handleSideButtonClick will use this.showModal('Thermostat Controls', '<div class="coming-soon">…') to inform the feature isn’t ready.
showToast vs tvFeedback: The TV remote likely calls showToast for feedback. The presence of tvFeedback div suggests an alternate approach: possibly they intended to use an in-modal toast (like populating that div with a message). But given the simpler route, they probably just use showToast globally which appears at bottom of screen. The tvFeedback element may remain unused or might be used if they wanted to position the toast near the remote.
At the end of the file, after defining these functions, they explicitly attach them to window: e.g. window.showTvModal = showTvModal; window.showRollershadeModal = showRollershadeModal; window.showFireTvModal = showFireTvModal; window.showRokuTvModal = showRokuTvModal; window.toggleLock = toggleLock; window.rollershadeCommand = rollershadeCommand; window.fireTvSendCommand = fireTvSendCommand; window.rokuTvSendCommand = rokuTvSendCommand; and possibly others like window.showThermostatModal if defined as an empty function, to ensure UIManager finds them.
This global exposure is crucial because UIManager uses if (typeof showX === 'function') showX() to call them. Without attaching to window, that check might fail under certain scoping conditions.
How It Fits In:
UIManager -> controls.js: All side menu actions (except Lights and Camera) end up here. UIManager acts as a router, and controls.js provides the actual content and device-specific logic. For example, pressing “TV” in the side menu: UIManager sees action showTvModal and calls showTvModal() which controls.js defines to create the UI and open the modal. The same for “Lock” which triggers toggleLock(), etc.
Modal Integration: controls.js uses showModalContent from modal.js to display its interfaces. It relies on modal.js animations and back button handling (the back arrow in the modal is used to navigate between, say, Fire TV remote and the TV selection menu – modal.js’s global back handler ends up calling uiManager.showBubbleChartModal() by default, which is somewhat off for TV; possibly the back arrow for TV modals wasn’t correctly overridden, or they rely on the “Back” button in those modals to simply close if it goes to bubble chart erroneously).
Device Commands: When these functions send commands (like locking a door or sending a TV keypress), they count on the Hubitat Maker API or other integration to perform the action, and then the Hubitat webhook to inform the app of state changes (for lock). For stateless actions like TV commands, they might not get a webhook (because pressing "Volume Up" doesn’t change a Hubitat device state meaningfully), so the immediate feedback is just the toast.
Toast usage: This file triggers user feedback via showToast (from ui.js). E.g., after calling the lock API, they show a "…ing" message. If something fails, the error message is shown. This keeps the user informed.
Overall, controls.js is a container for all those one-off UIs and device interactions that don’t fall under the generic device modal system. It makes the dashboard more than just lights – adding TV control, security (lock), and environment (shades) control, each with their own tailored interface.
scripts/camera.js (Camera Modal Controller)
Core Functionality: Manages the special camera feed modal. It opens the camera live stream (using VideoStream from video-stream.js) when triggered, and ensures it closes and cleans up properly. It also handles auto-closing the camera after a while to conserve resources. Key Elements:
State & Variables: At top, it declares:
let cameraModalTimeout = null; (a separate timeout for the camera, possibly to auto-close it after a shorter period or for something like turning off the feed if needed – though the main modal timeout might suffice).
let videoStream = null; – will hold an instance of the VideoStream class when the camera is open.
let currentVideoElement = null; – references the <video> (or <img> for MJPEG) element currently showing the stream.
showCameraModal(): The function to open the camera overlay.
It locates the camera modal elements (#cameraModalBg and #cameraModal in the HTML) and if not found, logs an error.
It makes the camera modal background visible by adding the .visible class. The CSS likely fades in the semi-transparent backdrop and perhaps slides the video container.
It sets activeModal = 'camera' to inform the system that a special modal is open.
It calls startModalTimeout() – the common 30s timeout from modal.js – so the camera will auto-close after 30 seconds of opening (unless interacted with).
If a previous VideoStream exists from a prior open, it stops it and sets it to null to avoid multiple streams.
Then it creates a new VideoStream() instance.
It also ensures the modal is clean: removes any existing <iframe> (perhaps if an MJPEG stream had left one) and any existing <video> element from a previous run.
Initializing Stream:
It tries WebRTC first by calling await videoStream.initializeStream('reolink'). This returns a video element if successful (and internally connects to the camera via WebRTC).
If WebRTC init succeeds, it logs success and calls logStreamPerformance('webrtc', startTime) – likely recording how long it took to start the stream (for debugging or performance metrics).
If WebRTC fails (throws), it catches and then tries videoStream.createHLSStream('reolink'). On HLS success, logs and calls logStreamPerformance('hls', ...).
If HLS also fails, it falls back to currentVideoElement = videoStream.createMJPEGStream('reolink') and logs that MJPEG is being used.
After one of these succeeds, it inserts the resulting currentVideoElement into the modal DOM:
modal.insertBefore(currentVideoElement, modal.querySelector('#closeCameraModal')) – so the video element is added just before the close button in the modal, filling the modal with the live feed.
If all attempts failed (WebRTC and HLS and MJPEG), it would log an error "Failed to initialize camera stream" (and presumably the modal would show nothing or a message).
hideCameraModal(): Handles closing the camera modal.
Removes the .visible class from #cameraModalBg to fade out the overlay.
Clears any cameraModalTimeout if it was using a separate timeout (this might have been intended for something else, but they ensure it’s null).
Sets activeModal = null and calls clearModalTimeout() to cancel the 30s auto-close as well.
Stops the video stream: if videoStream is not null, calls videoStream.stop() in a try/catch and then sets it to null.
Removes the video element from DOM if present and sets currentVideoElement = null.
Removes any lingering <iframe> (perhaps from MJPEG usage – it clears the src then removes it).
Logs that the camera stream was stopped.
Also, likely sets #cameraModalBg to display:none after transition (the CSS may handle hiding when not visible).
Event Listeners: On DOMContentLoaded, it attaches:
#closeCameraModal.onclick = hideCameraModal; so the close “×” button will trigger the cleanup.
#cameraModalBg.onclick such that clicking outside the video (on the background overlay) will also close the camera (check probably if (e.target.id === 'cameraModalBg') hideCameraModal()).
These mirror what modal.js does for the regular modal.
Integration with Notifications: The WebSocket handler in ui.js is set to automatically call showCameraModal() when a "reolink_webhook" message arrives (or if any WS message text contains "reolink"). This means if the security camera detects motion and the backend broadcasts an alert, the dashboard will pop up the camera feed modal on its own. This is a key interaction: main.js sends type: 'reolink_webhook' on any incoming camera trigger, and ui.js responds by calling showCameraModal() here.
User Trigger: The user can also manually open the camera by tapping the Camera side button (📷). UIManager will handle that action by calling showCameraModal() (wired via data-action and global function, since camera.js likely attaches window.showCameraModal = showCameraModal when loaded).
How It Interacts:
video-stream.js: This file is the consumer of the VideoStream class. It coordinates which streaming method to use without duplicating that logic. It also uses the video element returned by VideoStream to inject into the UI.
modal.js: Instead of using modal.js’s showModalContent, camera modal is separate. It manually toggles .visible on its background and handles insertion. This decoupling is likely because the camera modal might have different styling (full-screen content) and they wanted a distinct element (#cameraModalBg separate from #modalBg). It still uses the global activeModal and the modal timeout system though, to integrate with auto-close and avoid multiple modals open.
ui-manager & ui.js: The camera modal open/close sets activeModal='camera' so that UIManager’s closeActiveModal() knows to call hideCameraModal() if needed (like when auto-timer fires). Also, the Back arrow in the standard modal is programmed to specifically reopen the Lights modal, so it’s good that the camera modal uses a different mechanism (it has its own close button rather than a back button).
State Manager: The camera feed itself doesn’t update deviceStateManager (it’s not a device state change), but indirectly, camera triggers from backend don’t go into state; they just cause UI action.
Styles: The CSS likely has specific rules for #cameraModalBg.visible to display the overlay and maybe an animation for the video container (perhaps a fade/zoom). The <video> element is set to autoplay, muted (likely done inside VideoStream when creating it for HLS).
Performance Logging: The calls to logStreamPerformance(type, startTime) suggest they record how long the stream took to start for each method. Possibly to console or a server for optimizing (not critical to functionality, but shows some consideration for performance).
In summary, camera.js ensures the camera modal opens quickly when needed and always cleans up the video stream after use. It integrates the multi-protocol streaming capability from video-stream.js with the UI (starting, falling back, and displaying the video), and ties into the overall modal management by marking itself active and closing on timers or user request.
scripts/scenes.js (Lighting Scenes & “Bubble Chart” Controls)
Core Functionality: Implements the advanced lighting control interface – including predefined scenes (groups of color/brightness settings for multiple bulbs) and the interactive bubble chart UI for adjusting lights collectively or individually. This is one of the more complex front-end components, handling color calculations and dynamic HTML for possibly many devices at once. Key Elements:
Scene Definitions: At the top, const lifxScenes = [ … ] defines an array of scene presets. Each scene object includes:
name: e.g. "White", "Sunset", etc.
gradient: a CSS gradient string representing the scene’s color palette (for display in the UI as a preview bubble or background).
bulbs: an array of devices with specific settings for the scene. Each entry has:
deviceId: the ID of a bulb,
color: a hex color code,
brightness: a brightness level (likely 0-100 scale),
temp: color temperature (if applicable).
(In the "White" scene example, all bulbs are set to white, 100% brightness, 4000K temp. In "Sunset", different bulbs have orange/yellow/red hues with various brightness.)
wled: (optional) settings for an LED strip controller (WLED) if present. The scenes define a palette number, effect, brightness, and a color for an LED strip device, presumably so the strip’s color theme matches the scene.
Rendering the Lighting Modal (Global Controls): The script likely creates the HTML for the bubble chart modal:
Possibly defines a function function renderGlobalControls(device) which UIManager calls on updates. This function would use the provided device.attributes (the Bedroom Lights group’s state) to render the main controls for the group:
For example, a central power toggle (on/off) for all lights, perhaps drawn as a big circle or ring.
A brightness control ring (maybe a circular slider or an arc that shows brightness of the group).
It might display an aggregate color/hue if all lights are on a scene or allow a color temperature slider if relevant.
In code, renderGlobalControls(device) was found and it logs the group state (isOn, level, hue, etc.), so it clearly reads the attributes and likely updates a visual representation like dimming all bulbs icons or adjusting a master slider.
It could also update any UI elements indicating group status (like turning the “All Lights” paddle on/off if used here, but the paddle is outside this modal, so likely not).
There may be a portion of the modal designated for scene selection vs manual control. Possibly a toggle or separate screens (the back arrow might switch between “scenes list” and “manual control”).
Individual Bulb Bubbles: The “bubble chart” concept suggests each bulb is represented by a circular bubble whose size or brightness indicates something (like brightness level), and whose color indicates its color. The code likely:
Creates one bubble per light. It knows the relevant device IDs from DEVICE_MAP or a defined list (like all with control 'scenes').
Each bubble might be an interactive element – clicking it could open that bulb’s detail (via openDeviceModal). Indeed, scenes.js calls openDeviceModal(label, id, true) in some handler when a device bubble is clicked, with showBack=true to allow returning.
Bubbles could be arranged in a ring or grid, possibly sized by brightness or grouped by something (the use of “bubble-ring” classes in snippet [93] indicates some HTML structure where bubbles are placed).
Scene Selection Modal: The code defines function showScenesModal(). This probably displays a selection of scenes for the user to apply:
It uses lifxScenes.length to determine how many scene buttons to show.
Likely it generates HTML with one button or tile per scene. Each tile might show the scene’s name and a visual (the gradient or representative color).
Possibly structured as a ring or grid of bubbles with the scene gradient as background.
Each scene button would have an onclick to apply that scene (maybe calling applyScene(index) or similar).
The modal’s header might be “Scenes” or similar.
It probably uses showModalContent(html, true, '.side-btn[title="Lights"]') to display it (Back arrow true, triggered from Lights button).
Applying a Scene: There might be a function to actually activate a scene, e.g., applyScene(sceneIndex):
This would iterate through lifxScenes[sceneIndex].bulbs and send the appropriate commands to each device: setColor or setLevel on each bulb using apiService.sendDeviceCommand or Maker API URLs. Possibly simultaneously or in quick succession.
Also for the WLED component of the scene, it might call a Maker API or HTTP to set the LED strip’s palette/effect.
After sending commands, it could close the scenes modal (or maybe it leaves it open).
The state changes would propagate via Hubitat webhooks to update the UI, so the lights bubbles update to the new colors/brightness.
Event Handling in Lighting Modal: Scenes.js likely also contains code to handle user interactions in the lighting modal:
E.g., dragging a brightness ring or tapping a bubble might directly call Maker API to change brightness of the group or turn on/off a specific bulb.
Or it might rely on the device modals for detailed changes, leaving the bubble chart mostly for visualization and scene selection.
However, having a “global brightness” ring that the user can adjust all lights together would be natural. If implemented, adjusting it would call Maker API to dim the group (the group device might propagate level to members).
Integration with UIManager: Scenes.js defines functions but, being loaded as a module (type="module"), it likely exports none explicitly but attaches needed ones to window:
Probably does window.renderGlobalControls = renderGlobalControls; window.showBubbleChartModal = showBubbleChartModal; window.showScenesModal = showScenesModal; so that UIManager and modal.js can use them.
UIManager calls this.showBubbleChartModal() internally for Lights button. If showBubbleChartModal were a method of UIManager, it could simply call functions from scenes. But since our search saw UIManager directly calling this.showBubbleChartModal() on itself, perhaps UIManager actually implements that by delegating to scenes.
But the backModal.onclick in modal.js directly calls uiManager.showBubbleChartModal() on back arrow – implying UIManager class does have a method showBubbleChartModal. If it doesn’t (we didn’t see its implementation in UIManager), maybe UIManager simply references window.showBubbleChartModal (which scenes could provide). There’s some ambiguity, but logically, Scenes module should provide a way to open the bubble chart UI initially and UIManager uses it.
Complex UI Rendering: The HTML generation in scenes.js is likely the most complex of all:
It might generate SVG arcs, or lots of divs with classes to visually represent rings and bubbles.
The snippet [93] shows renderGlobalControls being referenced at character 18640, meaning scenes.js is quite large (over 18KB of code). It likely contains helper functions for color math (calculating complementary colors for scene gradients, etc.), and building intricate HTML for the bubble layout, possibly including inline SVG elements for rings or radial gradients.
It also possibly has logic for “arch” controls (the with-arches class seen in device modals might originate from here, if they reused styling).
Scenes might also tie in with the device state manager – for instance, if a bulb’s state changes (like one light turned off via physical switch), the bubble chart should update that bubble’s appearance. They handle that via UIManager subscription (updateGlobalControls and device modals) and possibly direct device bubble updates if open.
Performance Considerations: Because multiple bulbs can be controlled, scenes.js may batch commands. The Maker API calls might be rate-limited or cause multiple webhooks to fire at once. The code seems careful to not auto-refresh after sending a command to avoid “infinite loops” (like sending a command then immediately reading state which triggers another event). For example, api.js explicitly avoids refreshing on sendDeviceCommand because the webhook will update state. Scenes likely follows that pattern: send all commands, let the normal webhook events update the UI (which DeviceStateManager and UIManager will propagate).
How It Integrates:
UIManager/Modal: Scenes functions are invoked through UIManager actions or directly via modal UI elements. The initial open (Lights button) calls showBubbleChartModal, which presumably:
Gathers all current device states for lights (maybe using deviceStateManager data) to draw the chart.
Injects the composed HTML into a modal (like calling showModalContent(html, false, trigger) perhaps, with no back arrow because this is the top level of Lights modal).
Sets activeModal = 'main' (regular modal) and maybe provides a path to scenes list.
modal Back Button: When inside a device modal (opened from bubble chart) and user hits back arrow, modal.js calls uiManager.showBubbleChartModal(). That presumably triggers scenes to redraw the bubble chart modal content. Possibly the code caches the last state or just redraws fresh.
Device Updates: Scenes doesn’t directly subscribe to device changes (that’s handled by UIManager and deviceStateManager). But Scenes provides renderGlobalControls and possibly renderDeviceControls (for modals) that UIManager calls on state changes to update the UI without full redraw. For instance, if the group brightness changes, renderGlobalControls updates the global brightness dial. If an individual bulb changed and the bubble chart is open, UIManager might simply re-render all bubbles or call a function to update that one bubble’s style (though it currently updates via globalControls only if the group changed).
apiService usage: Scenes might call apiService.sendDeviceCommand to apply scenes or change lights. Since apiService is a module exported, scenes (also a module) could import it. However, since they didn’t show an import, they might just use the global window.apiService (which api.js attached to window) for convenience.
In summary, scenes.js provides a rich UI experience for controlling multiple lights together. It defines the preset scenes for one-tap ambiance changes and the interactive chart for manual control. It works closely with ui-manager (to coordinate opening and state updates) and devices.js (to drill down to individual device modals). It’s the piece that brings the lighting control to life beyond simple on/off, using color and brightness in an intuitive visual format.
styles/main.css (CSS Stylesheet)
Core Functionality: Defines the visual styling for all UI components of the dashboard. While we don’t detail every style, key responsibilities include:
Layout and Positioning: CSS for full-screen layout, placement of the side button toolbar, the switch card, lock indicator, clock, and modals. Likely uses flexbox or grid for centering elements like the modals.
Theming: Contains definitions for the default (light or dark) theme and a .dark-theme class on <body> to switch colors. For example, background-color, text-color differences for dark vs light mode, styles for the 🌙/☀️ theme toggle icon (maybe flipping it or changing filter).
Side Buttons: Styles .side-btns container and .side-btn buttons. Probably includes transitions for showing/hiding (when side-btns-visible is toggled by ui.js, CSS might move the toolbar off-screen or change opacity). Each .side-btn might be a circle with appropriate background, hover effect, and it contains an emoji (which may be replaced by an SVG background via ui.js, so .emoji-bg class might set background-size, etc.).
Switch Card and Paddles: Styles the rectangular wall plate (.wall-plate and .paddle-switch). The .paddle-switch.off class likely appears gray or dim, whereas without .off it might glow or use a brighter color to indicate “on”. There might be a power icon (⏻) inside each paddle; CSS ensures it’s centered and perhaps changes color when on vs off.
Lock Indicator: .lock-indicator for the lock emoji at top – could be a fixed position icon that changes color (green/red) for unlocked vs locked, or maybe it’s just text where the script swaps 🔓/🔒. CSS may enlarge it and give it some shadow or pulse when it changes.
Clock: .clock, .date, .time styles for font, size, maybe a modern digital look. Possibly large font for time, smaller for date, maybe a subtle glow.
Modal Styling:
Modal background (.modal-bg) likely has a semi-transparent black backdrop (for main modal and camera modal separately).
.modal class for the content container – perhaps with a rounded “bubble” appearance (since HTML uses <div class="modal bubble">). The class “bubble” might give it rounded corners and a certain background (maybe a translucent blurred background for a modern look).
.modal-header styling for titles inside modals.
Buttons inside modals (like .close-modal is the ×, .back-modal is the ←) – sized and positioned at corners. The back arrow might be a left-pointing arrow entity styled similarly to the close button but on the left side.
Animation classes: when modal.js adds .visible to .modal-bg, CSS likely triggers a transition that fades in the backdrop. The transform animations from showModalBg() (scale and translate on .modal) could be accompanied by a CSS transition property on transform/opacity, giving a smooth effect.
Toast Notifications: .toast class for the small notification messages. Possibly positioned fixed at bottom or top, with padding and rounded background. .toast.show might change its opacity or translate Y to slide it in. And .toast.success vs .toast.error might color it green vs red, for example.
Emoji Replacement Classes: .emoji-replaced and .emoji-bg likely have rules to display the background image and maybe hide the actual emoji text:
Possibly .emoji-bg { background-repeat: no-repeat; background-position: center; background-size: contain; } and .emoji-replaced { color: transparent; } to effectively replace the character with the image.
Remote Control Styles: Classes like .fire-tv-remote, .remote-section, .remote-btn for the TV remote modals:
.remote-section might define rows or groups of remote buttons (like top row, D-pad area, playback row).
.remote-btn may ensure each button is a nice circle or rounded rectangle with an icon (the inline SVG or emoji inside). For example, .btn-power, .btn-home, .btn-back might have specific icon styling. The inline SVG icons (like the power symbol path and circle) might be styled via CSS (e.g., stroke color).
Could define sizes so that the remote fills the modal nicely – e.g., width of remote sections, spacing between buttons.
.rollershade-controls and .rollershade-btn for the shade modal likely similar concept – big buttons with up/down arrows. They might reuse styles of remote buttons (since they are visually similar large icon buttons).
Device Control Modals: Classes like .control-panel, .with-arches (found in devices.js) hint at visual elements:
.with-arches might style some semi-circular indicators behind controls (perhaps arcs representing brightness or color temperature).
Sliders or color pickers might be styled if present (e.g., an input range slider given a custom look).
.device-coming-soon might style the placeholder text (italic, etc.) when a device modal is not implemented.
Bubble Chart (Lighting) Styles:
.global-ring-top, .bubble-ring, .bubble classes likely define the arrangement of the bubbles for lights:
.bubble-ring.count-X might adjust sizes depending on number of items to evenly space bubbles in a circle.
.bubble might be a circular element for each light or scene, possibly with a background color set via inline style or via a class representing that scene’s palette.
Scenes might have classes or IDs like #scene-Name to style specifically, or simpler, they inline style the gradient on each scene bubble element.
.bulb-icon or similar classes if they represent bulbs might be present, but since they use emoji -> SVG for icons, maybe each bulb bubble just uses color, not an icon of a bulb.
.coming-soon class to style placeholder texts (we saw that used in fallback messages).
Dark Mode adjustments: For .dark-theme, possibly inverts background from light gray to dark, text from black to white, side buttons from light to dark, etc., to be easier on eyes at night.
Responsiveness: Since the target is a fixed screen (wall panel), the CSS might be fixed dimensions (like assuming 1080p). But if needed, it might use viewport units to scale elements, ensuring it looks good on the panel.
In short, main.css provides the visual polish and layout for everything described above. It ensures the app looks like a cohesive, modern dashboard: large touch-friendly controls, subtle animations, and theme support. The codebase heavily relies on CSS classes toggled by scripts (like .off, .visible, .dark-theme, .show, etc.) to reflect state changes in styling.
manifest.json (PWA Manifest)
Core Functionality: This JSON file describes the app for installation on devices (Progressive Web App manifest). Key contents:
App name ("Smart Home Dashboard") and short_name ("SmartHome") for labels when installed.
Description of the app.
start_url: likely "/" indicating it opens at the root (assuming if served as a web app).
display: "fullscreen" to launch without browser UI, and orientation: probably "landscape" (if the dashboard is landscape-oriented).
theme_color and background_color: matching the app’s styling (maybe a dark gray like #232526 used in index head).
Icons: an array of icon objects (PNG images in various sizes) for the home screen and splash screen.
This manifest enables the dashboard to be added to a mobile home screen or used in kiosk mode as a standalone app. For an Electron app, it might not be strictly needed, but since the interface can be networked (they show an IP address in main.js logging, implying it’s accessible via browser too), the manifest makes it installable on tablets or phones for convenience.
Additional Files and Notes
HUBITAT_WEBHOOK_SETUP.md: Documentation (not code) likely explaining how to configure Hubitat to send events to this dashboard’s /api/hubitat/webhook. It would guide the user to set Hubitat Maker API or RM webhooks to the URL (including the local IP and port 4711).
localUrls.md: Possibly a list of useful local URLs (like the webhook endpoint, or camera stream addresses) for reference.
devicesfulldetails.json: A full export of device details from Hubitat. Used for development/reference – it lists every device’s capabilities, commands, etc., which was filtered into bedroomDevices in the code. Not used at runtime directly, but helpful for updating the device metadata in the code.
start.sh / package.json / .gitignore: Standard project files. start.sh ensures dependencies are installed and runs npm start, which likely launches Electron using main.js. package.json would list dependencies like Electron, Express, ws, etc., and define the start script. .gitignore and .git/ (present due to zipping) are just version control artifacts.
assets/: Contains static images:
remote-*.svg: SVG icons for each remote control button (power, home, back, play, pause, arrows, etc.). In the code they inlined SVG for some, but these files might have been an alternative approach or used in CSS background for buttons.
emoji/*.svg: The images used to replace emoji characters (mapped in ui.js). Each file name corresponds to an emoji codepoint (e.g., 1f4a1.svg for 💡, 1f512.svg for 🔒, etc.).
sw.js: A service worker file (likely to support the PWA aspect for offline use). It might cache the static assets and provide offline capability for the dashboard (this would be relevant if the dashboard can run in a browser outside Electron). The presence of sw.js and references in index.html (maybe none explicitly) suggests it could be registered by some script or by the PWA manifest.
Conclusion: This Smart Home Dashboard codebase is a full-stack application where the Electron/Express backend receives updates from Hubitat and notifies the front-end in real time via WebSockets. The front-end is a rich single-page app that provides an interactive control panel: from basic toggles and locks to advanced multi-light scene controls and live camera streaming. Each file in the project plays a specific role – the backend integrates with Hubitat, while the front-end scripts manage UI state, modal dialogs, and device-specific logic – all coming together to create a cohesive touch-friendly dashboard for smart home control.