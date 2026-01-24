# UI Refactoring Plan

## user_request
1. **Base**: Rebuild frontend based on `ui-lite` (Chatbot UI Lite).
2. **Wallet**: Trigger wallet popup immediately upon entering the site.
3. **Rendering**: Enable HTML/Markdown rendering, specifically for graphs.
4. **Navigation**: Sidebar with specific pages:
   - Server Selection
   - Memory Usage
   - My Containers (Status)
   *Note: These pages will be created but left empty for now.*
5. **Design**:
   - Language: English.
   - Theme: Dark Mode (Reference: Open WebUI).
   - Brand Colors: `#df6e01` (Primary), `#c45f00` (Secondary).

## Execution Steps

### Phase 1: Foundation Setup
- [x] Install Tailwind CSS and dependencies (PostCSS, Autoprefixer).
- [x] Initialize Tailwind configuration with Brand Colors and Dark Mode settings.
- [x] Install `react-router-dom` for navigation.
- [x] Install `lucide-react` for icons.
- [x] Install `rehype-raw` or similar for HTML rendering in Markdown.

### Phase 2: Layout Implementation
- [x] Create `MainLayout` component.
- [x] Implement `Sidebar` component.
   - Items: Chat (Home), Server Selection, Memory Usage, My Containers.
   - Style: Dark mode, fixed sidebar.
- [x] Set up Routing structure in `App.tsx` (or new `Router.tsx`).
- [x] Implement "Empty" placeholder pages for side items.

### Phase 3: Wallet Integration
- [x] Extract Wallet Logic from `App.tsx` into a `WalletProvider` (Kept in App.tsx/ChatPage for simplicity but refactored).
- [x] Ensure Wallet Connection Popup triggers immediately on mount (if not connected).
- [x] Style the Wallet Connect button/status to match the new design.

### Phase 4: Chat Interface Refactoring
- [x] Move existing Chat logic from `App.tsx` to `pages/ChatPage.tsx`.
- [x] Apply `ui-lite` styling to Chat Area (Messages, Input).
   - Bubble styles.
   - Input composer styles.
- [x] Enhance Markdown Rendering:
   - Support HTML (via rehype-raw).
   - Ensure Code Highlighting works (Tailwind styled pre/code).

### Phase 5: Design Polish & Cleanup
- [x] Specific styling tweaks (Neon accents via brand colors).
- [x] Verify Brand Colors usage (`#df6e01`, `#c45f00`).
- [x] Clean up legacy CSS (`styles.css` replaced with Tailwind directives).
