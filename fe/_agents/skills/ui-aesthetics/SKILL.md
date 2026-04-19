---
name: UI Aesthetics and Refactoring Standards
description: Guidelines for ensuring the UI is visually stunning, consistent, and feels premium across all pages and components.
---

# UI Aesthetics & Consistency Standards

When designing, modifying, or refactoring user interfaces in this project, you MUST prioritize creating a premium, modern, and highly polished aesthetic.

## 1. Global Consistency
- **Use Theme Variables:** Always utilize defined CSS variables instead of hardcoded hex colors. For example, use `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`.
- **Spacing:** Stick to the Tailwind default spacing scale (e.g., `p-4`, `p-6`, `gap-4`). Use consistent paddings for containers (e.g., `px-4 md:px-8` for page layouts).
- **Radius:** Rely on class utilities like `rounded-lg`, `rounded-xl`, `rounded-2xl` matching Shadcn/UI standards, avoiding chaotic mixtures of border radius.

## 2. Visual Excellence & "Premium Feel"
- **Avoid Flat/Generic Looks:** Utilize subtle borders (`border border-border`), gentle card backgrounds (`bg-card`), and soft shadows (`shadow-sm`, `shadow-md`) to build depth in the layout.
- **Micro-interactions:** Interactive elements (buttons, links, cards) MUST have hover and active states. 
  - Use `hover:bg-accent hover:text-accent-foreground` for subtle highlights.
  - Use opacity transitions: `transition-opacity hover:opacity-80`.
- **Empty States & Placeholders:** Never leave raw text for an empty state. Craft visually pleasing empty state components with a subtle icon (`lucide-react`) and muted text (`text-muted-foreground`).

## 3. Typography
- **Hierarchy:** Ensure explicit separation between headings and body text. 
  - Headings should use tight tracking (`tracking-tight`) and bold weights (`font-semibold` or `font-bold`).
  - Use `text-muted-foreground` or `opacity-80` to deemphasize secondary/helper texts.
- **Readability:** Keep line lengths readable using `max-w-prose` or `max-w-screen-md` when appropriate. Use sufficient line heights (`leading-relaxed` or `leading-7` in paragraphs).

## 4. Animations & Dynamics (tw-animate-css / Tailwind)
- Animate elements appearing on the screen to make the App feel alive.
- Use built-in animations like `animate-in fade-in zoom-in-95 slide-in-from-bottom-2` for modals, popovers, and loading newly fetched data grids.
- Keep duration snappy: `duration-200` or `duration-300` are ideal.

## 5. Forms, Buttons, and Inputs
- **File Uploads**: NEVER render the raw HTML `<input type="file" />` visibly, as it breaks the premium feel. Always hide it (`className="hidden"`) and use a custom trigger such as a Shadcn `<Button>` with an `<Upload />` icon, or a sleek dashed-border container.
- **Submit Buttons**: Form submission buttons should be prominent and appropriately sized. Use `w-full sm:w-auto` along with `flex justify-end` to align them logically. Always incorporate relevant `lucide-react` icons (e.g., `<Save className="mr-2 size-4" /> Save changes`).
- **Raw Data/API Text**: NEVER expose raw technical strings (e.g., `POST /api/v1/projects`) inside UI descriptions like `<CardDescription>`. Translate them into clean, user-friendly language.

## 6. Refactoring Checklist 
Whenever you are asked to "refactor" a UI component or page, run through this list:
- [ ] **Component Reusability**: Could this section be replaced by a pre-built `src/components/ui` component (like `Card`, `Badge`, `Alert`)?
- [ ] **Alignment**: Are Flexbox (`flex justify-between`) and Grid utilities applied correctly? Are buttons proportionally sized?
- [ ] **Color Palette**: Have all hardcoded colors (e.g., `text-gray-500`) been replaced with semantic theme colors (e.g., `text-muted-foreground`)?
- [ ] **Polishing Inputs**: Are file uploads properly masked with styled buttons?
- [ ] **Responsiveness**: Are there base and responsive variants (`md:`, `lg:`) so the design scales perfectly to desktop and mobile?
- [ ] **Polish**: Did you add states for `hover:`, `focus:`, and optionally `disabled:opacity-50`?
- [ ] **Sanitization**: Have raw API references or placeholder variable names been cleaned up for production-readiness?

## 7. Prototyping without real data
- If real data paths are unavailable, do not use `lorem ipsum`. Render a polished, logical mock dataset that makes the UI look real, while noting that it is placeholder data.
